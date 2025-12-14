import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Meeting Visualizer - 議事録をアートに変える',
  description: '会議の議事録を入力すると、Gemini 3 Pro (Nano Banana Pro) が手書き風インフォグラフィックを自動生成します。',
  keywords: ['議事録', 'インフォグラフィック', 'AI', 'Gemini', '図解', '会議', 'ビジュアライゼーション'],
  authors: [{ name: 'Meeting Visualizer' }],
  openGraph: {
    title: 'Meeting Visualizer - 議事録をアートに変える',
    description: '会議の議事録を入力すると、AIが手書き風インフォグラフィックを自動生成します。',
    type: 'website',
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meeting Visualizer',
    description: '議事録からインフォグラフィックを自動生成',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#667eea',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍌</text></svg>" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
