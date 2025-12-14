import { describe, it, expect, beforeEach } from 'vitest';
import { getJob, setJob, updateJob, deleteJob } from '@/lib/job-store';
import type { Job } from '@/types/job';

describe('job-store', () => {
  const createMockJob = (id: string): Job => ({
    id,
    status: 'queued',
    progress: {
      current: 0,
      total: 0,
      currentStep: 'テスト',
    },
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  beforeEach(() => {
    // Clean up any existing jobs
    deleteJob('test-job-1');
    deleteJob('test-job-2');
  });

  describe('setJob / getJob', () => {
    it('should store and retrieve a job', () => {
      const job = createMockJob('test-job-1');
      setJob(job);

      const retrieved = getJob('test-job-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-job-1');
      expect(retrieved?.status).toBe('queued');
    });

    it('should return undefined for non-existent job', () => {
      const retrieved = getJob('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('updateJob', () => {
    it('should update job properties', () => {
      const job = createMockJob('test-job-2');
      setJob(job);

      const updated = updateJob('test-job-2', {
        status: 'analyzing',
        progress: {
          current: 1,
          total: 3,
          currentStep: '分析中',
        },
      });

      expect(updated?.status).toBe('analyzing');
      expect(updated?.progress.current).toBe(1);
      expect(updated?.progress.currentStep).toBe('分析中');
    });

    it('should update updatedAt timestamp', async () => {
      const job = createMockJob('test-job-2');
      // Set a past timestamp
      job.updatedAt = '2024-01-01T00:00:00.000Z';
      setJob(job);

      const updated = updateJob('test-job-2', { status: 'completed' });

      // The new timestamp should be different (more recent)
      expect(updated?.updatedAt).not.toBe('2024-01-01T00:00:00.000Z');
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
        new Date('2024-01-01T00:00:00.000Z').getTime()
      );
    });

    it('should return undefined for non-existent job', () => {
      const result = updateJob('non-existent', { status: 'completed' });
      expect(result).toBeUndefined();
    });
  });

  describe('deleteJob', () => {
    it('should delete an existing job', () => {
      const job = createMockJob('test-job-1');
      setJob(job);

      const deleted = deleteJob('test-job-1');
      expect(deleted).toBe(true);
      expect(getJob('test-job-1')).toBeUndefined();
    });

    it('should return false for non-existent job', () => {
      const deleted = deleteJob('non-existent');
      expect(deleted).toBe(false);
    });
  });
});
