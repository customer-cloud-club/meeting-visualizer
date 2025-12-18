/**
 * ジョブ管理の型定義
 */

import type { ImageResult } from './image';

export type JobStatus =
  | 'queued'
  | 'analyzing'
  | 'generating_yaml'
  | 'generating_images'
  | 'completed'
  | 'failed';

export interface JobProgress {
  current: number;
  total: number;
  currentStep: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  progress: JobProgress;
  images: ImageResult[];
  error?: string;
  cancelled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobRequest {
  text: string;
  apiKey?: string;
  options?: {
    maxSlides?: number;
    style?: 'default' | 'minimal' | 'detailed';
    language?: 'ja' | 'en';
  };
}

export interface CreateJobResponse {
  jobId: string;
  status: 'queued';
  estimatedTime: number;
}
