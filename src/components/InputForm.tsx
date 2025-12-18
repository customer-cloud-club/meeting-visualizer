'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/context';

interface InputFormProps {
  onSubmit: (text: string, options: { maxSlides: number; style: string; language: 'ja' | 'en' }) => void;
  disabled?: boolean;
  language: 'ja' | 'en';
}

const MAX_CHARS = 200000;

function estimateSlideCount(text: string): number {
  const length = text.length;
  if (length < 500) return 2;
  if (length < 1500) return 4;
  if (length < 3000) return 6;
  if (length < 6000) return 8;
  if (length < 10000) return 10;
  return 12;
}

export default function InputForm({ onSubmit, disabled, language }: InputFormProps) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [slideMode, setSlideMode] = useState<'auto' | number>('auto');
  const [style, setStyle] = useState('default');

  const estimatedSlides = estimateSlideCount(text);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && text.length <= MAX_CHARS) {
      const maxSlides = slideMode === 'auto' ? estimatedSlides : slideMode;
      onSubmit(text, { maxSlides, style, language });
    }
  };

  const charPercentage = Math.min((text.length / MAX_CHARS) * 100, 100);
  const isOverLimit = text.length > MAX_CHARS;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Text Input Area */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="transcript" className="text-sm font-semibold text-gray-700">
            {t('inputLabel')}
          </label>
          <span className="badge badge-info">
            {t('analyzeWith')}
          </span>
        </div>

        <div className="relative">
          <textarea
            id="transcript"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('inputPlaceholder')}
            className={`input-field h-72 resize-none ${
              isOverLimit ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''
            } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
          />

          {/* Character Counter */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <div className={`text-sm font-medium ${
              isOverLimit ? 'text-red-500' : text.length > MAX_CHARS * 0.9 ? 'text-amber-500' : 'text-gray-400'
            }`}>
              {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOverLimit ? 'bg-red-500' : charPercentage > 90 ? 'bg-amber-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${charPercentage}%` }}
          />
        </div>

        {isOverLimit && (
          <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {t('charLimitExceeded')}
          </p>
        )}
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="slideMode" className="block text-sm font-semibold text-gray-700 mb-2">
            {t('slideCountLabel')}
          </label>
          <select
            id="slideMode"
            value={slideMode}
            onChange={(e) => setSlideMode(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
            className={`select-field ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
          >
            <option value="auto">🪄 {t('slideCountAuto')}</option>
            <optgroup label={t('slideCountManual')}>
              {[2, 4, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n}{t('slideCountUnit')}
                </option>
              ))}
            </optgroup>
          </select>
          {slideMode === 'auto' && text.length > 0 ? (
            <p className="mt-1.5 text-xs text-indigo-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              {t('slideCountAutoHint', { count: estimatedSlides, chars: text.length.toLocaleString() })}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-gray-500">
              {t('slideCountHint')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="style" className="block text-sm font-semibold text-gray-700 mb-2">
            {t('styleLabel')}
          </label>
          <select
            id="style"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className={`select-field ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
          >
            <option value="default">{t('styleDefault')}</option>
            <option value="minimal">{t('styleMinimal')}</option>
            <option value="detailed">{t('styleDetailed')}</option>
          </select>
          <p className="mt-1.5 text-xs text-gray-500">
            {t('styleHint')}
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={disabled || !text.trim() || isOverLimit}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {disabled ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{t('generatingButton')}</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{t('generateButton')}</span>
          </>
        )}
      </button>

      {/* Hint */}
      {!disabled && text.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <svg className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-indigo-800">{t('hintTitle')}</p>
            <p className="text-sm text-indigo-600 mt-1">
              {t('hintText')}
            </p>
          </div>
        </div>
      )}
    </form>
  );
}
