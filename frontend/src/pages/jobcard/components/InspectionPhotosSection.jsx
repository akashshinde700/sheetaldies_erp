import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function InspectionPhotosSection({ images, handleImageChange, ImageUploadSlot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Part Photos</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Five fixed columns crush the slots on a phone — collapse to 2/3. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => (
            <ImageUploadSlot key={i} index={i}
              value={typeof images[i] === 'string' ? images[i] : null}
              onChange={handleImageChange} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
