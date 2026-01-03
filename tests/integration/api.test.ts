import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'https://meeting-dev.aidreams-factory.com';

/**
 * API統合テスト
 * AWS環境ではサーバーサイドのGEMINI_API_KEY環境変数を使用するため、
 * クライアントからAPIキーを送信する必要はありません。
 */
describe('API Integration Tests', () => {
  describe('Health Check API', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('meeting-visualizer');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Generate API', () => {
    it('should accept valid text input and return job ID', async () => {
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'テスト用の議事録です。本日の会議では新機能の開発について議論しました。',
          slideCount: 2,
          style: 'default',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jobId).toBeDefined();
      expect(typeof data.jobId).toBe('string');
    });

    it('should reject empty text', async () => {
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: '',
          slideCount: 2,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should handle long text input', async () => {
      const longText = 'あ'.repeat(51000);
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: longText,
          slideCount: 2,
        }),
      });

      // API may accept or reject long text depending on configuration
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Job Status API', () => {
    let jobId: string;

    beforeAll(async () => {
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: '統合テスト用議事録。プロジェクト進捗確認と次のマイルストーンについて。',
          slideCount: 1,
          style: 'minimal',
        }),
      });
      const data = await response.json();
      jobId = data.jobId;
    });

    it('should return job status', async () => {
      const response = await fetch(`${BASE_URL}/api/jobs/${jobId}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(jobId);
      expect(['queued', 'analyzing', 'generating_yaml', 'generating_images', 'completed', 'failed']).toContain(data.status);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await fetch(`${BASE_URL}/api/jobs/non-existent-job-id`);
      expect(response.status).toBe(404);
    });
  });
});
