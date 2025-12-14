'use client';

import { useState } from 'react';

interface InputFormProps {
  onSubmit: (text: string, options: { maxSlides: number; style: string }) => void;
  disabled?: boolean;
}

const MAX_CHARS = 50000;

export default function InputForm({ onSubmit, disabled }: InputFormProps) {
  const [text, setText] = useState('');
  const [maxSlides, setMaxSlides] = useState(8);
  const [style, setStyle] = useState('default');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && text.length <= MAX_CHARS) {
      onSubmit(text, { maxSlides, style });
    }
  };

  const charPercentage = Math.min((text.length / MAX_CHARS) * 100, 100);
  const isOverLimit = text.length > MAX_CHARS;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* テキスト入力エリア */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="transcript" className="text-sm font-semibold text-gray-700">
            議事録テキスト
          </label>
          <span className="badge badge-info">
            Gemini 3 Pro で分析
          </span>
        </div>

        <div className="relative">
          <textarea
            id="transcript"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="会議の議事録やメモをここに貼り付けてください...&#10;&#10;例：&#10;・プロジェクトの進捗報告&#10;・課題と解決策の議論&#10;・次回アクションアイテム"
            className={`input-field h-72 resize-none ${
              isOverLimit ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''
            } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
          />

          {/* 文字数カウンター */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <div className={`text-sm font-medium ${
              isOverLimit ? 'text-red-500' : text.length > MAX_CHARS * 0.9 ? 'text-amber-500' : 'text-gray-400'
            }`}>
              {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </div>
          </div>
        </div>

        {/* プログレスバー */}
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
            文字数制限を超えています
          </p>
        )}
      </div>

      {/* オプション */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="maxSlides" className="block text-sm font-semibold text-gray-700 mb-2">
            生成枚数
          </label>
          <select
            id="maxSlides"
            value={maxSlides}
            onChange={(e) => setMaxSlides(Number(e.target.value))}
            className={`select-field ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
          >
            {[2, 4, 6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n}枚
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500">
            内容に応じて最適な枚数を提案します
          </p>
        </div>

        <div>
          <label htmlFor="style" className="block text-sm font-semibold text-gray-700 mb-2">
            デザインスタイル
          </label>
          <select
            id="style"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className={`select-field ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
          >
            <option value="default">標準 - バランス重視</option>
            <option value="minimal">シンプル - 要点のみ</option>
            <option value="detailed">詳細 - 情報量重視</option>
          </select>
          <p className="mt-1.5 text-xs text-gray-500">
            図解の情報密度を調整します
          </p>
        </div>
      </div>

      {/* 送信ボタン */}
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
            <span>生成中...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>インフォグラフィックを生成</span>
          </>
        )}
      </button>

      {/* ヒント */}
      {!disabled && text.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <svg className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-indigo-800">ヒント</p>
            <p className="text-sm text-indigo-600 mt-1">
              議事録の構造がはっきりしていると、より良い図解が生成されます。
              トピックごとに段落を分けると効果的です。
            </p>
          </div>
        </div>
      )}
    </form>
  );
}
