#!/usr/bin/env python3
"""Create slides and a narration-synchronized timeline from mocked UI screenshots.
Requires Pillow, ffmpeg, DejaVu fonts and docs/media/training-audio/01.mp3 to 10.mp3.
From the repo root extract tour frames (use the same ffmpeg for encoding):
  mkdir -p docs/media/training-work
  ffmpeg -ss 1 -i docs/media/erp-demo-screen-tour.mp4 -vf 'fps=1/5' docs/media/training-work/tour-%02d.png
  FFMPEG=ffmpeg python scripts/create-hindi-training-slides.py
  FFMPEG=ffmpeg python scripts/build-training-metadata.py
  ffmpeg -f concat -safe 0 -i docs/media/training-work/slides.concat -f concat -safe 0 -i docs/media/training-work/audio.concat -t 470.5 -r 2 -c:v libx264 -c:a aac -af volume=-2dB -pix_fmt yuv420p -movflags +faststart docs/media/training-work/base.mp4
  ffmpeg -i docs/media/training-work/base.mp4 -i docs/media/erp-training-hindi.srt -f ffmetadata -i docs/media/training-work/chapters.ffmeta -map 0:v -map 0:a -map 1:s -map_metadata 2 -map_chapters 2 -c:v copy -c:a copy -c:s mov_text -metadata:s:s:0 language=hin -movflags +faststart docs/media/erp-training-beginners.mp4
The stated duration assumes the existing narration. To use another narration, set
TRAINING_AUDIO to its directory for both Python scripts, TRAINING_SCRIPT to its
transcript and TRAINING_CAPTION_BASE to the desired subtitle basename for the
metadata script, and set -t to the new total duration plus a short tail.
Captions use approximate timing. Slides are screenshots, not an authenticated
end-to-end recording.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import os
import re
import subprocess

out=Path('docs/media/training-work'); out.mkdir(parents=True,exist_ok=True)
form=Path('brag-output/composition/assets/screens')
tour=lambda n: out / f'tour-{n:02}.png'
slides=[
('SHURUAAT','ERP kya karta hai?',tour(2),['Customer se maal aana, treatment, quality, billing aur dispatch ka record ek jagah rakhta hai.','Yeh screens DEMO hain. Asli database par poora workflow verify nahi hua.']),
('NAKSHA','Kaam ka aam kram',tour(2),['Masters → Inward → Job Card → Planning / VHT → Quality → Invoice → Dispatch.','Har business ka approved process alag ho sakta hai. Team ke niyam bhi maanein.']),
('LOGIN','Account se sign in',tour(1),['Password Login: email aur password daalein, phir Sign In dabayein.','OTP Login: email daal kar Send OTP karein; code kisi ko na batayein.']),
('NAVIGATION','Menu aur access',tour(2),['Baayein menu se module kholein. Dashboard par overview dekhein.','Menu na dikhe ya access na mile to Admin se role check karayein. Kaam ke baad Sign Out karein.']),
('MASTERS','Party ki jankari',tour(3),['Parties mein customer aur jahan lagu ho processor/vendor ko verify karein.','Naam, pata aur tax details original record se milayein. Master update adhikrit vyakti kare.']),
('MASTERS','Process aur machines',tour(4),['Processes, Items aur Machines mein process, part aur furnace ka sahi master janchein.','Party Rates, HT Specs, Temp Cycle Graphs aur Invoice Series bhi team se verify karayein.']),
('INWARD','Maal receive hone par',tour(6),['Inwards se nayi Inward Entry kholein. Company Name mein sahi customer chunein.','Customer challan number/date aur material receive date ko kagaz se milayein.']),
('INWARD','Challan details',tour(6),['Lagu hone par PO number/date, vehicle, delivery person aur issued by bharein.','Customer ya process nahi mile to galat option na chunein: master update karwayein.']),
('INWARD','Har part alag darj karein',form/'01-inward.png',['Add Item se line jodein. Process, part, material, hardness, quantity aur weight check karein.','Alag part ho to nayi line jodein. Units aur total ko received maal se milayein.']),
('INWARD','Submit se pehle janch',form/'01-inward.png',['Sab details check karke Create Inward dabayein. Confirmation aur challan number note karein.','Error aaye to dobara submit se pehle register mein record bana hai ya nahi, dekhein.']),
('JOB CARD','Inward ke items chunein',tour(7),['Inward register mein challan khojkar detail kholein.','Pending Items mein sambandhit items select karein; phir Create Job Card dabayein.']),
('JOB CARD','Challan aur job card mein farq',tour(8),['Challan maal receive hone ka record hai; job card plant mein kaam track karta hai.','Related Job Cards mein sahi card dekhein. Customer, part, quantity aur process milayein.']),
('INSPECTION','Aane wale maal ki janch',tour(8),['Job card detail se available Inspection kholein aur actual observation record karein.','Damage ya galat part ho to zimmedar vyakti ko batayein. Andaze se result na bharein.']),
('PLANNING','Daily planning',tour(9),['Daily Planning mein din ka kaam aur furnace plan dekhein.','Kaunsa job kis machine aur samay par hoga, apne production team se confirm karein.']),
('VHT','Run sheet samjhein',form/'03-runsheet.png',['VHT Runsheet se nayi run sheet kholein; sambandhit job aur furnace details dekhein.','Yeh production ka record hai. Form dikhne ka matlab treatment complete hona nahi hai.']),
('VHT','Asli reading hi darj karein',form/'03-runsheet.png',['Time, temperature aur cycle ki jankari actual plant record ke anusaar bharein.','Next / Save se pehle details check karein. Save ke baad record kholkar verify karein.']),
('PRODUCTION','Tempering aur energy',tour(10),['Menu se Tempering Plan aur Energy Log kholein. Yahan VHT list reference ke liye hai.','Machine operator se actual cycle aur meter readings confirm karein; data anuman se na bharein.']),
('QUALITY','Certificate banana',form/'04-certificate.png',['Certificates se naya certificate kholein; job card details se bhi link mil sakta hai.','Customer, part, specification aur actual test result mool record se milayein.']),
('QUALITY','Rework aur NC',tour(13),['Problem par team ki process ke mutabik NC Register aur Rework Data dekhein.','Rework ke baad certificate apne aap sahi hoga, aisa na maanein; quality se confirm karein.']),
('INVOICE','Billing ki taiyari',form/'05-invoice.png',['Invoices se naya invoice kholein. Sahi customer aur sambandhit jobs select karein.','Quantity, weight aur approved rate ko job aur party record se milayein.']),
('INVOICE','Tax aur total verify',form/'05-invoice.png',['Aage Step 4 Tax & totals mein taxable value, GST aur final total verify karein.','Save ke baad invoice number note karein. External posting ki success alag se janchein.']),
('DISPATCH','Maal bhejne se pehle',tour(15),['Dispatch mein sahi challan / delivery record kholein ya naya banayein.','Customer, item, quantity aur packing ko invoice aur actual maal se milayein.']),
('PRINT','Document ki copy',tour(11),['Yeh certificate list hai, print preview nahi. Preview mein naam, number aur items janchein.','PDF banne se physical print sahi hone ki guarantee nahi: pehle test print karein.']),
('FOLLOW UP','Pending aur stock',tour(16),['Pending List se ruka kaam dekhein aur sambandhit team ko follow up dein.','Inventory mein available stock dekhein. Khali list par filter aur access bhi janchein.']),
('REPORTS','Reports aur quotation',tour(18),['Customer Quotes mein quotation; Analytics mein available business reports dekhein.','Furnace Utilisation, Idle Time aur Plant Losses se periodic reports dekhi ja sakti hain.']),
('ADMIN','Access aur audit',tour(19),['Admin Users aur Audit Logs manage / review kar sakta hai.','Rate, tax, production settings ya user access sirf adhikrit vyakti badle.']),
('SAAVDHANI','Kya abhi verify karna hai?',tour(2),['Yeh screen-based demo hai; koi asli save, calculation ya business flow prove nahi hua.','Safe demo database par login se dispatch tak hands-on practice aur print test zaroor karein.']),
('AGLA KADAM','Guide aur madad',tour(2),['Saath ki Hindi user guide aur test report padhein. Sawal apni team / ERP admin se poochhein.','Poora hands-on version banane ke liye safe demo database par flow verify karna zaroori hai.']),
]
reg='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
fhead=ImageFont.truetype(bold,40); ftag=ImageFont.truetype(bold,23); fbody=ImageFont.truetype(reg,28); fsmall=ImageFont.truetype(reg,20)
def wrap(draw, text, font, width):
 words=text.split(); result=[]; line=''
 for word in words:
  candidate=(line+' '+word).strip()
  if line and draw.textlength(candidate,font=font)>width: result.append(line); line=word
  else: line=candidate
 if line: result.append(line)
 return result
def checked_text(draw, xy, text, font, fill, max_x=1865, max_y=920):
 box=draw.textbbox(xy,text,font=font)
 if box[0] < 0 or box[1] < 0 or box[2] > max_x or box[3] > max_y:
  raise ValueError(f'Overflow: {text!r} -> {box}')
 draw.text(xy,text,font=font,fill=fill)

chapter_groups=[2,2,2,4,3,4,2,2,2,5]
chapter_names=['OVERVIEW','LOGIN','MASTERS','INWARD','JOB CARD','PRODUCTION','QUALITY','INVOICE','DISPATCH','OTHER']
for i,(tag,title,src,points) in enumerate(slides,1):
 canvas=Image.new('RGB',(1920,1080),'#f4f3ef'); d=ImageDraw.Draw(canvas)
 chapter=next(n for n in range(10) if i <= sum(chapter_groups[:n+1]))
 checked_text(d,(55,25),'SVT ERP  /  BEGINNER TRAINING',ftag,'#123c56')
 checked_text(d,(1485,25),f'SLIDE {i:02d} / {len(slides):02d}',ftag,'#123c56')
 # Chapter strip helps viewers see where they are in the full workflow.
 for c,name in enumerate(chapter_names):
  x=55+c*181
  d.rounded_rectangle((x,63,x+173,96),radius=6,fill='#087897' if c==chapter else '#e3e9e8')
  checked_text(d,(x+8,69),name,ImageFont.truetype(bold,16),'#ffffff' if c==chapter else '#44606a',max_x=x+173)
 screenshot=Image.open(src).convert('RGB')
 if 'tour-' in src.name: screenshot=screenshot.crop((0,0,screenshot.width,screenshot.height-75))
 # Enlarge form details for legibility; the remainder of the screen is not shown.
 zoom={3:(400,120,1040,720),7:(260,60,1435,325),8:(260,60,1435,325),
       9:(255,320,1440,900),15:(255,70,1440,900),16:(255,70,1440,900),
       18:(255,70,1440,900),20:(255,70,1440,900),21:(255,70,1440,900)}
 crop_x=crop_y=0
 if i in zoom:
  rect=zoom[i]
  assert rect[2] <= screenshot.width and rect[3] <= screenshot.height
  crop_x,crop_y=rect[:2]
  screenshot=screenshot.crop(rect)
  checked_text(d,(55,112),'FORM DETAIL  /  ZOOMED VIEW',fsmall,'#416574')
 scale=min(1180/screenshot.width,760/screenshot.height)
 screenshot=screenshot.resize((round(screenshot.width*scale),round(screenshot.height*scale)),Image.Resampling.LANCZOS)
 image_x=55+(1180-screenshot.width)//2
 assert image_x+screenshot.width <= 1235 and 145+screenshot.height <= 905, f'Screenshot overflow on slide {i}'
 canvas.paste(screenshot,(image_x,145))
 # Highlight a relevant control without covering text. Coordinates refer to the
 # original screenshots and are translated into the actual crop and scale.
 focus={3:[(520,375,920,655)],7:[(303,171,526,238)],
        8:[(625,171,1388,239),(303,237,839,302)],
        9:[(304,387,1388,590)],10:[(1210,835,1390,891)],
        15:[(290,240,1400,347)],16:[(290,365,1400,654)],
        18:[(290,239,1402,337)],20:[(290,239,1402,349)],
        21:[(290,140,1407,225)]}
 if i in focus:
  checked_text(d,(635,112),'ORANGE = YAHAN DEKHEIN',fsmall,'#8a4b00',max_x=1235)
  for x1,y1,x2,y2 in focus[i]:
   p=(round(image_x+(x1-crop_x)*scale),round(145+(y1-crop_y)*scale),
      round(image_x+(x2-crop_x)*scale),round(145+(y2-crop_y)*scale))
   if not (image_x <= p[0] < p[2] <= image_x+screenshot.width and 145 <= p[1] < p[3] <= 145+screenshot.height):
    raise ValueError(f'Highlight outside screenshot: slide {i}, {p}')
   d.rounded_rectangle(p,radius=8,outline='#ec8a18',width=5)
 x=1280; checked_text(d,(x,145),tag,ftag,'#007698')
 y=195
 for line in wrap(d,title,fhead,580):
  checked_text(d,(x,y),line,fhead,'#122b38'); y+=55
 y+=26
 for point in points:
  d.ellipse((x,y+9,x+10,y+19),fill='#007698')
  for line in wrap(d,point,fbody,550):
   checked_text(d,(x+22,y),line,fbody,'#273942'); y+=40
  y+=30
 d.rounded_rectangle((55,940,1865,1025),radius=12,fill='#102f40')
 checked_text(d,(80,958),'DEMO UI  •  MOCK DATA  •  NO REAL DATABASE SAVE  •  SCREENSHOTS',ftag,'white',max_y=1025)
 checked_text(d,(80,994),'Pause karke padhein | Screenshots: Playwright screen tour | Real workflow abhi verify nahi hua',fsmall,'#cde2e9',max_y=1025)
 canvas.save(out/f'slide-{i:02}.png',optimize=True)
# The chapter weights are approximate, not word-level alignment. Each chapter's
# timing comes from its audio file; all narration files use the same voice.
weights=[[.28,.72],[.58,.42],[.44,.56],[.23,.15,.28,.34],
         [.31,.35,.34],[.13,.22,.25,.40],[.57,.43],[.48,.52],
         [.62,.38],[.26,.23,.13,.25,.13]]
audio=Path(os.environ.get('TRAINING_AUDIO', 'docs/media/training-audio'))
ffmpeg=os.environ.get('FFMPEG','ffmpeg')
durations=[]
for i in range(1,11):
 result=subprocess.run([ffmpeg,'-hide_banner','-i',str(audio/f'{i:02}.mp3')],capture_output=True,text=True)
 m=re.search(r'Duration: (\d+):(\d+):(\d+(?:\.\d+)?)',result.stderr)
 if not m: raise RuntimeError(f'Cannot read audio duration for chapter {i}')
 h,mi,s=m.groups(); durations.append(int(h)*3600+int(mi)*60+float(s))
assert sum(map(len,weights)) == len(slides)
with open(out/'slides.concat','w') as f, open(out/'audio.concat','w') as a:
 n=0; timestamp=0; chapters=[]
 for chapter,(duration,group) in enumerate(zip(durations,weights),1):
  chapters.append((timestamp,chapter)); timestamp+=duration
  audio_path=os.path.relpath(audio/f'{chapter:02}.mp3', out)
  a.write(f"file '{audio_path}'\n")
  for weight in group:
   n+=1; f.write(f"file 'slide-{n:02}.png'\nduration {duration*weight:.5f}\n")
 f.write(f"file 'slide-{n:02}.png'\n")
with open(out/'chapters.txt','w') as f:
 for seconds,chapter in chapters:
  f.write(f'{int(seconds//60):02}:{int(seconds%60):02}  Chapter {chapter:02}\n')
print(f'{len(slides)} slides checked; {timestamp:.2f} seconds of narration')
