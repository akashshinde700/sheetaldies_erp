import React, { useRef, useState, useEffect } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const API_BASE = import.meta.env.VITE_API_URL || '';

function ImageSlot({ index, initialUrl, onChange, saving }) {
  const inputRef = useRef();
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (initialUrl) {
      const fullUrl = initialUrl.startsWith('http') ? initialUrl : `${API_BASE}${initialUrl}`;
      setPreview(fullUrl);
    } else {
      setPreview(null);
    }
  }, [initialUrl]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onChange(index, file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleClear = () => {
    setPreview(null);
    onChange(index, null);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        className={`w-full aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
          preview ? 'border-sky-300 bg-sky-50 hover:opacity-80' : 'border-slate-300 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/40'
        }`}
        title={preview ? 'Click to change image' : 'Click to upload image'}
      >
        {preview ? (
          <img src={preview} alt={`Part ${index}`} className="w-full h-full object-cover rounded-md" />
        ) : (
          <div className="flex flex-col items-center text-center">
            <ImagePlus className="h-6 w-6 text-slate-300" />
            <p className="text-[10px] text-slate-400 mt-1">Photo {index}</p>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        onChange={handleFile}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />
      {preview && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm"
          title="Remove image"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {saving && (
        <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-sky-600 animate-spin" />
        </div>
      )}
    </div>
  );
}

export default function PhotoSection({ handleImageChange, existingImages, savingSlot }) {
  const images = existingImages || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Part Photos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <ImageSlot
              key={i}
              index={i}
              initialUrl={images[`image${i}`]}
              onChange={handleImageChange}
              saving={savingSlot === i}
            />
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-3 italic">
          * Photos appear in the printed job card. Accepted: JPG, JPEG, PNG, WEBP (max 5 MB each).
        </p>
      </CardContent>
    </Card>
  );
}
