/**
 * インメモリジョブストア
 * 本番環境ではRedisなどに置き換え推奨
 */

import type { Job } from '@/types/job';

const jobs = new Map<string, Job>();

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
