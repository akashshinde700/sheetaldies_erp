#!/usr/bin/env python3
"""Generate approximate Hindi captions and MP4 chapter metadata for the training video.

Captions are estimated from the narration script and local silence boundaries; they
are NOT a manually verified word-level transcript. FFmpeg and the narration clips
must be available. The WebVTT and SRT sidecars can also be used with players that
cannot display the MP4's optional subtitle track.
"""
from pathlib import Path
import math, os, re, subprocess, textwrap

ffmpeg = os.environ.get('FFMPEG', 'ffmpeg')
media = Path('docs/media')
source = Path(os.environ.get('TRAINING_SCRIPT','docs/ERP-TRAINING-NARRATION-HI.md')).read_text(encoding='utf-8')
audio_dir = Path(os.environ.get('TRAINING_AUDIO','docs/media/training-audio'))
caption_base = os.environ.get('TRAINING_CAPTION_BASE','erp-training-hindi')
sections = re.split(r'^## \d+\. .+\n', source, flags=re.M)[1:]
assert len(sections) == 10
names = ['ERP overview','Login and navigation','Master data','Inward entry','Job card and inspection','Planning and VHT','Quality','Invoice','Dispatch and printing','Reports and next steps']

def run_ffmpeg(audio, *args):
    return subprocess.run([ffmpeg, '-hide_banner', '-i', str(audio), *args], capture_output=True, text=True).stderr

def to_time(value, separator):
    ms=max(0,round(value*1000)); h, ms=divmod(ms,3600000); m,ms=divmod(ms,60000); s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02}{separator}{ms:03}'

def phrases(text):
    sentences=re.split(r'(?<=।)\s+', ' '.join(text.split()))
    chunks=[]
    for sentence in filter(None,sentences):
        # Balance long sentences instead of leaving a 1-word tail on screen.
        words=sentence.split()
        count=max(1,math.ceil(len(sentence)/72))
        while count > 1:
            target=len(' '.join(words))/count
            split=min(range(1,len(words)),key=lambda i:abs(len(' '.join(words[:i]))-target))
            chunks.append(' '.join(words[:split])); words=words[split:]; count-=1
        if words: chunks.append(' '.join(words))
    # Short cues are difficult to read; merge them when the result fits two lines.
    merged=[]
    for chunk in chunks:
        candidate=(merged[-1]+' '+chunk) if merged else chunk
        lines=textwrap.wrap(candidate,width=44,break_long_words=False,break_on_hyphens=False)
        if merged and (len(chunk)<24 or len(merged[-1])<24) and len(lines)<=2:
            merged[-1]=candidate
        else: merged.append(chunk)
    return merged

def silence_points(log):
    starts=[float(x) for x in re.findall(r'silence_start:\s*([\d.]+)',log)]
    ends=[float(x) for x in re.findall(r'silence_end:\s*([\d.]+)',log)]
    return [(a+b)/2 for a,b in zip(starts,ends) if b-a>=.18]

cues=[]; offset=0; chapters=[]
for index,section in enumerate(sections,1):
    audio=audio_dir/f'{index:02}.mp3'
    info=run_ffmpeg(audio,'-af','silencedetect=noise=-35dB:d=0.18','-f','null','-')
    m=re.search(r'Duration: (\d+):(\d+):(\d+(?:\.\d+)?)',info)
    if not m: raise RuntimeError(f'Audio duration missing: {audio}')
    h,mn,s=m.groups(); duration=int(h)*3600+int(mn)*60+float(s)
    text=phrases(section); weights=[len(re.sub(r'\s','',t)) for t in text]; total=sum(weights)
    pauses=silence_points(info); starts=[0.0]; used=0
    for j,weight in enumerate(weights[:-1]):
        used += weight
        target=duration*used/total
        candidates=[p for p in pauses if abs(p-target)<1.0 and p>starts[-1]+.8 and p<duration-1]
        boundary=min(candidates,key=lambda p:abs(p-target)) if candidates else target
        boundary=max(starts[-1]+.6,min(boundary,duration-(len(weights)-j-1)*.6))
        starts.append(boundary)
    starts.append(duration)
    chapters.append((offset,offset+duration,names[index-1]))
    for i,t in enumerate(text):
        start=offset+starts[i]; end=offset+starts[i+1]-.04
        lines='\n'.join(textwrap.wrap(t,width=44,break_long_words=False,break_on_hyphens=False))
        assert end>start and len(lines.splitlines())<=2, (index,t)
        cues.append((start,end,lines))
    offset+=duration
assert all(cues[i][1] <= cues[i+1][0]+.001 for i in range(len(cues)-1))
with (media/f'{caption_base}.srt').open('w',encoding='utf-8') as srt, (media/f'{caption_base}.vtt').open('w',encoding='utf-8') as vtt:
    vtt.write('WEBVTT\n\nNOTE Auto-timed from narration; timing is approximate.\n\n')
    for n,(start,end,text) in enumerate(cues,1):
        srt.write(f'{n}\n{to_time(start,",")} --> {to_time(end,",")}\n{text}\n\n')
        vtt.write(f'{to_time(start,".")} --> {to_time(end,".")}\n{text}\n\n')
with (media/'training-work'/'chapters.ffmeta').open('w',encoding='utf-8') as meta:
    meta.write(';FFMETADATA1\ntitle=SVT ERP Beginner Training\n')
    for start,end,name in chapters:
        meta.write(f'[CHAPTER]\nTIMEBASE=1/1000\nSTART={round(start*1000)}\nEND={round(end*1000)}\ntitle={name}\n')
print(f'{len(cues)} approximate captions, {len(chapters)} chapters, {offset:.2f}s')
