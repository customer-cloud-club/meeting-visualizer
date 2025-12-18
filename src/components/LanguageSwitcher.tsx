'use client';

import { useI18n } from '@/i18n/context';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="flex items-center gap-1 bg-white/10 backdrop-blur rounded-lg p-1">
      <button
        onClick={() => setLanguage('ja')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          language === 'ja'
            ? 'bg-white text-gray-800 shadow-sm'
            : 'text-white/80 hover:text-white hover:bg-white/10'
        }`}
      >
        日本語
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          language === 'en'
            ? 'bg-white text-gray-800 shadow-sm'
            : 'text-white/80 hover:text-white hover:bg-white/10'
        }`}
      >
        EN
      </button>
    </div>
  );
}
