import React from 'react';

export default function InspectionPhotosSection({ images, handleImageChange, ImageUploadSlot }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-violet-500 text-[14px]">photo_library</span>
        </div>
        <p className="section-title">Part Photos</p>
        <span className="text-[10px] text-slate-400 ml-auto">Up to 5 images · JPG/PNG/WebP · Max 5MB each</span>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {[1,2,3,4,5].map(i => (
          <ImageUploadSlot key={i} index={i}
            value={typeof images[i] === 'string' ? images[i] : null}
            onChange={handleImageChange} />
        ))}
      </div>
    </div>
  );
}
