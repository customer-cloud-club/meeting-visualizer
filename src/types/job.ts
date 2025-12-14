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
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobRequest {
  text: string;
  options?: {
    maxSlides?: number;
    style?: 'default' | 'minimal' | 'detailed';
  };
}

export interface CreateJobResponse {
  jobId: string;
  status: 'queued';
  estimatedTime: number;
}
