'use client';

import type { JobProgress, JobStatus } from '@/types/job';

interface ProgressDisplayProps {
  status: JobStatus;
  progress: JobProgress;
}

const steps = [
  { id: 'analyzing', label: 'テキスト分析', icon: '🔍' },
  { id: 'generating_yaml', label: 'プロンプト生成', icon: '📝' },
  { id: 'generating_images', label: '画像生成', icon: '🎨' },
  { id: 'completed', label: '完了', icon: '✨' },
];

const statusToStep: Record<JobStatus, number> = {
  queued: 0,
  analyzing: 1,
  generating_yaml: 2,
  generating_images: 3,
  completed: 4,
  failed: -1,
};

export default function ProgressDisplay({ status, progress }: ProgressDisplayProps) {
  const currentStep = statusToStep[status];
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="card animate-fade-in">
      {/* ステップインジケーター */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isCompleted = currentStep > stepNumber;
          const isPending = currentStep < stepNumber;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* ステップ円 */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-xl
                    transition-all duration-500 relative
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${isActive ? 'bg-indigo-500 text-white ring-4 ring-indigo-100' : ''}
                    ${isPending ? 'bg-gray-100 text-gray-400' : ''}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{step.icon}</span>
                  )}

                  {/* パルスアニメーション */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-25" />
                  )}
                </div>
                <span className={`
                  mt-2 text-xs font-medium whitespace-nowrap
                  ${isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}
                `}>
                  {step.label}
                </span>
              </div>

              {/* コネクター */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-green-500 w-full' : isActive ? 'bg-indigo-500 w-1/2' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 現在のステータス */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {progress.currentStep || '準備中...'}
        </h3>
        {status === 'generating_images' && progress.total > 0 && (
          <p className="text-gray-500">
            {progress.current} / {progress.total} 枚
          </p>
        )}
      </div>

      {/* プログレスバー（画像生成時のみ詳細表示） */}
      {status === 'generating_images' && progress.total > 0 && (
        <div className="space-y-3">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${percentage}%` }} />
          </div>

          {/* 画像サムネイルプレビュー */}
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: progress.total }).map((_, i) => (
              <div
                key={i}
                className={`
                  w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold
                  transition-all duration-300
                  ${i < progress.current
                    ? 'bg-green-100 border-green-500 text-green-600'
                    : i === progress.current
                      ? 'bg-indigo-100 border-indigo-500 text-indigo-600 animate-pulse'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  }
                `}
              >
                {i < progress.current ? '✓' : i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nano Banana Pro バッジ */}
      {status === 'generating_images' && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <span>Nano Banana Pro で手書き風画像を生成中</span>
        </div>
      )}
    </div>
  );
}
