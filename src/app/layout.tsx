import type { Metadata, Viewport } from 'next';
import './globals.css';
import { I18nProvider } from '@/i18n/context';

export const metadata: Metadata = {
  title: 'Meeting Visualizer - Transform Minutes into Art',
  description: 'AI-powered tool that transforms meeting minutes into beautiful hand-drawn infographics using Gemini 3 Pro.',
  keywords: ['meeting minutes', 'infographic', 'AI', 'Gemini', 'visualization', 'meeting', '議事録', '図解'],
  authors: [{ name: 'Meeting Visualizer' }],
  openGraph: {
    title: 'Meeting Visualizer - Transform Minutes into Art',
    description: 'AI transforms your meeting minutes into beautiful hand-drawn infographics.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meeting Visualizer',
    description: 'Transform meeting minutes into infographics with AI',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍌</text></svg>" />
      </head>
      <body className="antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
