'use client';

import { useState, useCallback } from 'react';
import InputForm from '@/components/InputForm';
import ProgressDisplay from '@/components/ProgressDisplay';
import ImageGallery from '@/components/ImageGallery';
import type { Job, JobStatus } from '@/types/job';
import type { ImageResult } from '@/types/image';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<JobStatus>('queued');
  const [progress, setProgress] = useState({ current: 0, total: 0, currentStep: '' });
  const [images, setImages] = useState<ImageResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (text: string, options: { maxSlides: number; style: string }) => {
    setIsProcessing(true);
    setError(null);
    setImages([]);
    setStatus('queued');
    setProgress({ current: 0, total: 0, currentStep: '開始中...' });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, options }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start generation');
      }

      const { jobId } = await response.json();

      // ポーリングでジョブ状態を監視
      const pollJob = async () => {
        const jobResponse = await fetch(`/api/jobs/${jobId}`);
        const job: Job = await jobResponse.json();

        setStatus(job.status);
        setProgress(job.progress);

        if (job.images.length > 0) {
          setImages(job.images);
        }

        if (job.status === 'completed') {
          setIsProcessing(false);
          return;
        }

        if (job.status === 'failed') {
          setError(job.error || '生成に失敗しました');
          setIsProcessing(false);
          return;
        }

        // 1秒後に再ポーリング
        setTimeout(pollJob, 1000);
      };

      pollJob();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setIsProcessing(false);
    }
  }, []);

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Meeting Visualizer
          </h1>
          <p className="text-lg text-gray-600">
            議事録を入力すると、Nano Banana Proが手書き風インフォグラフィックを自動生成します
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <InputForm onSubmit={handleSubmit} disabled={isProcessing} />
        </div>

        {isProcessing && (
          <ProgressDisplay status={status} progress={progress} />
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-semibold">エラー</p>
            <p>{error}</p>
          </div>
        )}

        {images.length > 0 && (
          <ImageGallery images={images} />
        )}
      </div>
    </main>
  );
}
