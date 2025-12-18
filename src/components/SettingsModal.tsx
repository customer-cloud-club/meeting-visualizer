'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/context';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useI18n();
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredApiKey();
      if (stored) {
        setApiKey(stored);
      }
      setSaved(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError(t('settingsRequired'));
      return;
    }

    // Basic validation - Gemini API keys start with "AIza"
    if (!apiKey.startsWith('AIza')) {
      setError(t('settingsInvalid'));
      return;
    }

    setStoredApiKey(apiKey.trim());
    setSaved(true);
    setError(null);

    setTimeout(() => {
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('settingsTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* API Key Input */}
        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-semibold text-gray-700 mb-2">
              {t('settingsApiKey')}
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError(null);
                setSaved(false);
              }}
              placeholder={t('settingsApiKeyPlaceholder')}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                error
                  ? 'border-red-400 focus:ring-red-100'
                  : 'border-gray-200 focus:ring-indigo-100 focus:border-indigo-400'
              }`}
            />
            {error && (
              <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <p className="text-sm text-gray-500">
            {t('settingsApiKeyHint')}
          </p>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {t('settingsApiKeyLink')}
          </a>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            {t('settingsClose')}
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`flex-1 px-4 py-3 font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
            }`}
          >
            {saved ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('settingsSaved')}
              </>
            ) : (
              t('settingsSave')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
