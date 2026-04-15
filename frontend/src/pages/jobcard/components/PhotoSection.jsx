import React, { useRef, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function ImageSlot({ index, initialUrl, onChange }) {
  const inputRef = useRef();
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (initialUrl) {
      // If it's a relative path starting with /uploads, prepend the API base
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
        className={`w-full aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
          preview ? 'border-sky-300 bg-sky-50' : 'border-slate-300 bg-slate-50 hover:border-indigo-300'
        }`}>
        {preview ? (
          <img src={preview} alt={`Part ${index}`} className="w-full h-full object-cover rounded-md" />
        ) : (
          <div className="text-center">
            <span className="material-symbols-outlined text-2xl text-slate-300">add_photo_alternate</span>
            <p className="text-[10px] text-slate-400 mt-1">Photo {index}</p>
          </div>
        )}
      </button>
      <input ref={inputRef} type="file" onChange={handleFile} accept="image/*"
        className="hidden" />
      {preview && (
        <button type="button" onClick={() => { setPreview(null); onChange(index, null); }}
          className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-rose-600 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      )}
    </div>
  );
}

export default function PhotoSection({ handleImageChange, existingImages }) {
  const images = existingImages || {};

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
        <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-violet-500 text-[15px]">add_photo_alternate</span>
        </div>
        <p className="section-title">Part Photos</p>
        <span className="text-[10px] text-slate-400">visual documentation – up to 5 images</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <ImageSlot 
            key={i} 
            index={i} 
            initialUrl={images[`image${i}`]}
            onChange={handleImageChange} 
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-3 italic">
        * Uploaded photos appear in the printed job card to help shop-floor operators identify parts and orientations.
      </p>
    </div>
  );
}
