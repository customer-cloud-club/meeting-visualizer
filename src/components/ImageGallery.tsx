'use client';

import { useState } from 'react';
import type { ImageResult } from '@/types/image';

interface ImageGalleryProps {
  images: ImageResult[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);

  if (images.length === 0) {
    return null;
  }

  const downloadAll = async () => {
    for (const image of images) {
      const link = document.createElement('a');
      link.href = `/api/images/${image.id}`;
      link.download = `${image.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise((r) => setTimeout(r, 100));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          生成された図解 ({images.length}枚)
        </h2>
        <button
          onClick={downloadAll}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          すべてダウンロード
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative group cursor-pointer"
            onClick={() => setSelectedImage(image)}
          >
            <img
              src={`/api/images/${image.id}`}
              alt={image.title}
              className="w-full aspect-square object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                クリックで拡大
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600 truncate">
              {image.title}
            </p>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-full">
            <img
              src={`/api/images/${selectedImage.id}`}
              alt={selectedImage.title}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="mt-4 flex items-center justify-between text-white">
              <h3 className="text-lg font-semibold">{selectedImage.title}</h3>
              <a
                href={`/api/images/${selectedImage.id}`}
                download={`${selectedImage.id}.png`}
                className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                ダウンロード
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
