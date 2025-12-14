'use client';

import type { JobProgress, JobStatus } from '@/types/job';

interface ProgressDisplayProps {
  status: JobStatus;
  progress: JobProgress;
}

const statusLabels: Record<JobStatus, string> = {
  queued: '待機中',
  analyzing: 'テキスト分析中',
  generating_yaml: 'プロンプト生成中',
  generating_images: '画像生成中',
  completed: '完了',
  failed: 'エラー',
};

export default function ProgressDisplay({ status, progress }: ProgressDisplayProps) {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {statusLabels[status]}
        </h3>
        <span className="text-sm text-gray-500">
          {progress.current} / {progress.total}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-sm text-gray-600">
        {progress.currentStep}
      </p>

      {status === 'generating_images' && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Nano Banana Proで画像を生成中...</span>
        </div>
      )}
    </div>
  );
}
