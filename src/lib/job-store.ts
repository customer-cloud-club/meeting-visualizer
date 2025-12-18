/**
 * インメモリジョブストア
 * 本番環境ではRedisなどに置き換え推奨
 */

import type { Job } from '@/types/job';

// Next.jsの開発モードでもモジュール間で共有されるようにglobalThisを使用
declare global {
  // eslint-disable-next-line no-var
  var __jobStore: Map<string, Job> | undefined;
}

const jobs = globalThis.__jobStore ?? new Map<string, Job>();
globalThis.__jobStore = jobs;

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function setJob(job: Job): void {
  jobs.set(job.id, job);
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;

  const updatedJob = {
    ...job,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  jobs.set(id, updatedJob);
  return updatedJob;
}

export function deleteJob(id: string): boolean {
  return jobs.delete(id);
}

export function cancelJob(id: string): Job | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;

  const updatedJob = {
    ...job,
    cancelled: true,
    status: 'failed' as const,
    error: 'Cancelled by user',
    updatedAt: new Date().toISOString(),
  };
  jobs.set(id, updatedJob);
  return updatedJob;
}

export function isJobCancelled(id: string): boolean {
  const job = jobs.get(id);
  return job?.cancelled === true;
}

// 古いジョブを削除（1時間以上経過）
export function cleanupOldJobs(): number {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  let deleted = 0;

  for (const [id, job] of jobs) {
    if (new Date(job.createdAt).getTime() < oneHourAgo) {
      jobs.delete(id);
      deleted++;
    }
  }

  return deleted;
}
