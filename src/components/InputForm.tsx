'use client';

import { useState } from 'react';

interface InputFormProps {
  onSubmit: (text: string, options: { maxSlides: number; style: string }) => void;
  disabled?: boolean;
}

export default function InputForm({ onSubmit, disabled }: InputFormProps) {
  const [text, setText] = useState('');
  const [maxSlides, setMaxSlides] = useState(8);
  const [style, setStyle] = useState('default');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text, { maxSlides, style });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="transcript" className="block text-sm font-medium text-gray-700 mb-2">
          議事録テキスト
        </label>
        <textarea
          id="transcript"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="議事録テキストをここに貼り付けてください..."
          className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={disabled}
        />
        <p className="mt-1 text-sm text-gray-500">
          {text.length.toLocaleString()} 文字
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="maxSlides" className="block text-sm font-medium text-gray-700 mb-2">
            最大枚数
          </label>
          <select
            id="maxSlides"
            value={maxSlides}
            onChange={(e) => setMaxSlides(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
          >
            {[2, 4, 6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n}枚
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
            スタイル
          </label>
          <select
            id="style"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
          >
            <option value="default">標準</option>
            <option value="minimal">シンプル</option>
            <option value="detailed">詳細</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {disabled ? '生成中...' : '図解を生成する'}
      </button>
    </form>
  );
}
