import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Meeting Visualizer - 議事録図解ジェネレーター',
  description: '議事録を入力すると、Nano Banana Proが手書き風インフォグラフィックを自動生成します',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
