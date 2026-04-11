import React, { useRef, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function ImageSlot({ index, initialUrl, onChange }) {
  const inputRef = useRef();
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (initialUrl) {
      const fullUrl = initialUrl.startsWith('http') ? initialUrl : `${API_BASE}${initialUrl}`;
      setPreview(fullUrl);
    }
  }, [initialUrl]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
          : <div className="text-center">
              <span className="material-symbols-outlined text-slate-300 text-2xl block">add_photo_alternate</span>
              <span className="text-[10px] text-slate-400 mt-1 block">Photo {index}</span>
            </div>
        }
      </button>
      {preview && (
        <button type="button" onClick={() => { setPreview(null); onChange(index, null); inputRef.current.value = ''; }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow hover:bg-rose-600">✕</button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

export default function CertPhotosSection({ handleImageChange, existingImages = {} }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
        <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-violet-500 text-[15px]">add_photo_alternate</span>
        </div>
        <p className="section-title">Part Photos</p>
        <span className="text-[10px] text-slate-400">up to 5 images</span>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <ImageSlot 
            key={i} 
            index={i} 
            initialUrl={existingImages[`image${i}`]}
            onChange={handleImageChange} 
          />
        ))}
      </div>
    </div>
  );
}
