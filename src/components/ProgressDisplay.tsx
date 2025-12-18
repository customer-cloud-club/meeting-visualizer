'use client';

import { useI18n } from '@/i18n/context';
import type { JobProgress, JobStatus } from '@/types/job';

interface ProgressDisplayProps {
  status: JobStatus;
  progress: JobProgress;
  onStop?: () => void;
  isStopping?: boolean;
}

export default function ProgressDisplay({ status, progress, onStop, isStopping }: ProgressDisplayProps) {
  const { t } = useI18n();

  const steps = [
    { id: 'analyzing', label: t('stepAnalyzing'), icon: '🔍' },
    { id: 'generating_yaml', label: t('stepGeneratingYaml'), icon: '📝' },
    { id: 'generating_images', label: t('stepGeneratingImages'), icon: '🎨' },
    { id: 'completed', label: t('stepCompleted'), icon: '✨' },
  ];

  const statusToStep: Record<JobStatus, number> = {
    queued: 0,
    analyzing: 1,
    generating_yaml: 2,
    generating_images: 3,
    completed: 4,
    failed: -1,
  };

  const currentStep = statusToStep[status];
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="card animate-fade-in">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isCompleted = currentStep > stepNumber;
          const isPending = currentStep < stepNumber;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
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

                  {/* Pulse Animation */}
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

              {/* Connector */}
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

      {/* Current Status */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {progress.currentStep || t('progressPreparing')}
        </h3>
        {status === 'generating_images' && progress.total > 0 && (
          <p className="text-gray-500">
            {t('progressImageCount', { current: progress.current, total: progress.total })}
          </p>
        )}
      </div>

      {/* Progress Bar (detailed display only during image generation) */}
      {status === 'generating_images' && progress.total > 0 && (
        <div className="space-y-3">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${percentage}%` }} />
          </div>

          {/* Image Thumbnail Preview */}
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

      {/* Nano Banana Pro Badge */}
      {status === 'generating_images' && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <span>{t('progressNanoBanana')}</span>
        </div>
      )}

      {/* Stop Button */}
      {onStop && status !== 'completed' && status !== 'failed' && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onStop}
            disabled={isStopping}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isStopping ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{t('stoppingButton')}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>{t('stopButton')}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
