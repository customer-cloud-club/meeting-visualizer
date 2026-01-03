'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import type { ImageResult } from '@/types/image';

interface ImageGalleryProps {
  images: ImageResult[];
  jobId?: string;
}

const getImageUrl = (filepath: string) => {
  // filepathはS3キー（例: anonymous/jobId/imageId.png）またはレガシーパス
  const cleanPath = filepath.replace(/^\/+/, '').replace(/^generated\//, '');
  return `/api/images/serve?path=${encodeURIComponent(cleanPath)}`;
};

export default function ImageGallery({ images, jobId }: ImageGalleryProps) {
  const { t } = useI18n();
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);
  const [downloading, setDownloading] = useState(false);

  if (images.length === 0) {
    return null;
  }

  const downloadImage = async (image: ImageResult, showAlert = true) => {
    try {
      const response = await fetch(getImageUrl(image.filepath));
      if (!response.ok) throw new Error(t('errorImageFetch'));

      const blob = await response.blob();
      const extension = image.mimeType?.includes('png') ? 'png' : 'jpg';
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${image.title || image.id}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Download error:', error);
      if (showAlert) {
        alert(t('errorDownloadFailed'));
      }
      return false;
    }
  };

  const downloadAll = async () => {
    if (!jobId) {
      alert(t('errorNoDownloadInfo'));
      return;
    }

    setDownloading(true);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          images: images.map(img => ({
            filepath: img.filepath,
            title: img.title,
            id: img.id,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(t('errorDownloadFailed'));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `infographics_${images.length}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert(t('errorDownloadFailed'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-3xl">🎨</span>
            {t('galleryTitle')}
          </h2>
          <p className="text-gray-500 mt-1">
            {t('gallerySubtitle', { count: images.length })}
          </p>
        </div>

        <button
          onClick={downloadAll}
          disabled={downloading}
          className="btn-secondary flex items-center gap-2"
        >
          {downloading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{t('downloadingButton')}</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{t('downloadAllButton', { count: images.length })}</span>
            </>
          )}
        </button>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="group relative cursor-pointer card-hover"
            onClick={() => setSelectedImage(image)}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-md group-hover:shadow-xl transition-shadow">
              <img
                src={getImageUrl(image.filepath)}
                alt={image.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium truncate">
                      {image.title}
                    </span>
                    <span className="flex-shrink-0 w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Number Badge */}
            <div className="absolute top-2 left-2 w-7 h-7 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md">
              <span className="text-xs font-bold text-gray-700">{index + 1}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Success Message */}
      <div className="mt-8 p-4 bg-green-50 rounded-xl border border-green-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-green-800">{t('gallerySuccess')}</p>
          <p className="text-sm text-green-600">
            {t('gallerySuccessHint')}
          </p>
        </div>
      </div>

      {/* Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          {/* Background Overlay */}
          <div className="absolute inset-0 glass-dark" />

          {/* Modal Content */}
          <div
            className="relative max-w-4xl w-full animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={getImageUrl(selectedImage.filepath)}
                alt={selectedImage.title}
                className="w-full max-h-[70vh] object-contain"
              />

              {/* Footer */}
              <div className="p-6 flex items-center justify-between border-t border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{selectedImage.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {(selectedImage.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <button
                  onClick={() => downloadImage(selectedImage)}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{t('downloadButton')}</span>
                </button>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-center gap-2 mt-4">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    img.id === selectedImage.id
                      ? 'bg-white scale-125'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
