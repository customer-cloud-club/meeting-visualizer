/**
 * 画像生成関連の型定義
 */

export interface ImageResult {
  id: string;
  index: number;
  title: string;
  filepath: string;
  mimeType: string;
  size: number;
  generatedAt: string;
}

export interface GenerationProgress {
  current: number;
  total: number;
  currentStep: string;
  images: ImageResult[];
}

export interface GenerationOptions {
  outputDir: string;
  delayBetweenRequests?: number; // ms
  retryCount?: number;
  apiKey?: string;
}
