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
        throw new Error(data.error || '生成の開始に失敗しました');
      }

      const { jobId } = await response.json();

      const pollJob = async () => {
        try {
          const jobResponse = await fetch(`/api/jobs/${jobId}`);
          if (!jobResponse.ok) {
            throw new Error('ジョブの取得に失敗しました');
          }

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

          setTimeout(pollJob, 1000);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'エラーが発生しました');
          setIsProcessing(false);
        }
      };

      pollJob();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setIsProcessing(false);
    }
  }, []);

  const handleReset = () => {
    setImages([]);
    setError(null);
    setStatus('queued');
    setProgress({ current: 0, total: 0, currentStep: '' });
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="glass border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">🍌</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-800">Meeting Visualizer</h1>
              <p className="text-xs text-gray-500">Powered by Nano Banana Pro</p>
            </div>
          </div>

          <a
            href="https://github.com/ryoma3736/meeting-visualizer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
            </svg>
            <span className="text-sm font-medium hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* ヒーローセクション */}
        {!isProcessing && images.length === 0 && (
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full text-white text-sm mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Gemini 3 Pro 搭載</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              議事録を
              <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                アート
              </span>
              に変える
            </h2>

            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              会議の内容をAIが分析し、
              <br className="sm:hidden" />
              手書き風インフォグラフィックを自動生成
            </p>

            {/* 特徴 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 max-w-3xl mx-auto">
              {[
                { icon: '🔍', title: 'AI分析', desc: 'Gemini 3 Proがテキストを解析' },
                { icon: '🎨', title: '手書き風', desc: 'Nano Banana Proで温かみのある図解' },
                { icon: '⚡', title: '高速生成', desc: '数分で複数枚の画像を生成' },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center"
                >
                  <div className="text-4xl mb-3">{feature.icon}</div>
                  <h3 className="font-bold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-white/70">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 入力フォーム */}
        <div className={`card ${images.length > 0 ? 'mb-8' : ''}`}>
          {images.length > 0 && (
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">新しい図解を生成</h2>
              <button
                onClick={handleReset}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                結果をクリア
              </button>
            </div>
          )}
          <InputForm onSubmit={handleSubmit} disabled={isProcessing} />
        </div>

        {/* 進捗表示 */}
        {isProcessing && (
          <div className="mb-8">
            <ProgressDisplay status={status} progress={progress} />
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="card mb-8 animate-fade-in border-l-4 border-red-500">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-red-800 text-lg">エラーが発生しました</h3>
                <p className="text-red-600 mt-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-4 text-sm text-red-600 hover:text-red-800 underline"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 画像ギャラリー */}
        {images.length > 0 && <ImageGallery images={images} />}
      </main>

      {/* フッター */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <span>🍌</span>
              <span>Meeting Visualizer</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Powered by Gemini 3 Pro</span>
              <span>•</span>
              <span>Nano Banana Pro</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
