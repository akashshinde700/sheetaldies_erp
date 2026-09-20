import React, { useRef, useState, useEffect } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const API_BASE = import.meta.env.VITE_API_URL || '';

function ImageSlot({ index, initialUrl, onChange }) {
  const inputRef = useRef();
  const [preview, setPreview] = useState(null);
  // Once the user clears a slot, the saved URL must not put the photo back —
  // the old effect only ever set a preview, never cleared one.
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (initialUrl && !cleared) {
      const fullUrl = initialUrl.startsWith('http') ? initialUrl : `${API_BASE}${initialUrl}`;
      setPreview(fullUrl);
    }
  }, [initialUrl, cleared]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCleared(false);
    setPreview(URL.createObjectURL(file));
    onChange(index, file);
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => !preview && inputRef.current.click()}
        className={`w-full aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
          preview ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
        }`}>
        {preview
          ? <img src={preview} alt="" className="w-full h-full object-cover rounded-xl" />
          : <div className="flex flex-col items-center text-center">
              <ImagePlus className="h-6 w-6 text-slate-300" />
              <span className="text-[10px] text-slate-400 mt-1 block">Photo {index}</span>
            </div>
        }
      </button>
      {preview && (
        <button type="button" onClick={() => { setCleared(true); setPreview(null); onChange(index, null); inputRef.current.value = ''; }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow hover:bg-rose-600">
          <X className="h-3 w-3" strokeWidth={3} />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

export default function CertPhotosSection({ handleImageChange, existingImages = {} }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Part Photos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="w-24 sm:w-28">
              <ImageSlot
                index={i}
                initialUrl={existingImages[`image${i}`]}
                onChange={handleImageChange}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
