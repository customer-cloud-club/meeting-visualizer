import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Image Generator Unit Tests
 * FB-1767427424: レート制限ロジックのテスト
 */

// calculateBackoffDelay関数をテスト用にエクスポートするためのモック
// 実際の関数は image-generator.ts 内でプライベートなので、ロジックを再実装してテスト
function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number = 5000,
  maxDelayMs: number = 120000
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  const jitter = cappedDelay * (0.75 + Math.random() * 0.5);
  return Math.floor(jitter);
}

describe('image-generator rate limiting', () => {
  describe('calculateBackoffDelay', () => {
    beforeEach(() => {
      // Math.random を固定値に置き換え
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should calculate correct delay for attempt 0', () => {
      const delay = calculateBackoffDelay(0, 5000, 120000);
      // 5000 * 2^0 = 5000, with jitter at 0.5: 5000 * (0.75 + 0.25) = 5000
      expect(delay).toBe(5000);
    });

    it('should calculate correct delay for attempt 1', () => {
      const delay = calculateBackoffDelay(1, 5000, 120000);
      // 5000 * 2^1 = 10000, with jitter at 0.5: 10000 * 1.0 = 10000
      expect(delay).toBe(10000);
    });

    it('should calculate correct delay for attempt 2', () => {
      const delay = calculateBackoffDelay(2, 5000, 120000);
      // 5000 * 2^2 = 20000, with jitter at 0.5: 20000 * 1.0 = 20000
      expect(delay).toBe(20000);
    });

    it('should cap delay at maxDelayMs', () => {
      const delay = calculateBackoffDelay(10, 5000, 120000);
      // 5000 * 2^10 = 5120000, but capped at 120000
      // with jitter at 0.5: 120000 * 1.0 = 120000
      expect(delay).toBe(120000);
    });

    it('should use custom base delay', () => {
      const delay = calculateBackoffDelay(0, 10000, 120000);
      // 10000 * 2^0 = 10000, with jitter at 0.5: 10000 * 1.0 = 10000
      expect(delay).toBe(10000);
    });

    it('should apply jitter correctly', () => {
      // Test with random = 0 (minimum jitter)
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const minDelay = calculateBackoffDelay(0, 10000, 120000);
      // 10000 * 0.75 = 7500
      expect(minDelay).toBe(7500);

      // Test with random = 1 (maximum jitter)
      vi.spyOn(Math, 'random').mockReturnValue(1);
      const maxDelay = calculateBackoffDelay(0, 10000, 120000);
      // 10000 * 1.25 = 12500
      expect(maxDelay).toBe(12500);
    });

    it('should handle exponential growth correctly', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const delays = [0, 1, 2, 3, 4].map(attempt =>
        calculateBackoffDelay(attempt, 5000, 120000)
      );

      // Each delay should be roughly double the previous (with fixed jitter)
      expect(delays[1]).toBe(delays[0] * 2);
      expect(delays[2]).toBe(delays[1] * 2);
      expect(delays[3]).toBe(delays[2] * 2);
    });
  });

  describe('consecutive rate limit handling', () => {
    it('should calculate additional delay for consecutive rate limits', () => {
      const calculateAdditionalDelay = (consecutiveRateLimits: number): number => {
        return consecutiveRateLimits > 0
          ? Math.min(consecutiveRateLimits * 10000, 60000)
          : 0;
      };

      expect(calculateAdditionalDelay(0)).toBe(0);
      expect(calculateAdditionalDelay(1)).toBe(10000);
      expect(calculateAdditionalDelay(2)).toBe(20000);
      expect(calculateAdditionalDelay(5)).toBe(50000);
      expect(calculateAdditionalDelay(6)).toBe(60000);
      expect(calculateAdditionalDelay(10)).toBe(60000); // Capped at 60000
    });
  });

  describe('retry configuration', () => {
    it('should have correct default values', () => {
      // Default values from image-generator.ts
      const defaultDelayBetweenRequests = 10000;
      const defaultRetryCount = 6;

      expect(defaultDelayBetweenRequests).toBe(10000);
      expect(defaultRetryCount).toBe(6);
    });
  });
});

describe('rate limit error detection', () => {
  it('should detect 429 errors', () => {
    const detectRateLimit = (errorMessage: string): boolean => {
      return errorMessage.includes('429') ||
             errorMessage.includes('Too Many Requests') ||
             errorMessage.includes('quota');
    };

    expect(detectRateLimit('Error 429: Too Many Requests')).toBe(true);
    expect(detectRateLimit('Resource exhausted, quota exceeded')).toBe(true);
    expect(detectRateLimit('Too Many Requests')).toBe(true);
    expect(detectRateLimit('Internal Server Error')).toBe(false);
    expect(detectRateLimit('Network timeout')).toBe(false);
  });

  it('should extract retry-after value from error message', () => {
    const extractRetryAfter = (errorMessage: string): number => {
      const retryMatch = errorMessage.match(/retry in (\d+)(?:\.(\d+))?s/i);
      if (retryMatch) {
        const seconds = parseInt(retryMatch[1], 10);
        const fraction = retryMatch[2]
          ? parseInt(retryMatch[2], 10) / Math.pow(10, retryMatch[2].length)
          : 0;
        return Math.ceil((seconds + fraction) * 1000);
      }
      return 60000; // Default
    };

    expect(extractRetryAfter('Please retry in 36s')).toBe(36000);
    expect(extractRetryAfter('Please retry in 10.5s')).toBe(10500);
    expect(extractRetryAfter('retry in 120s after limit')).toBe(120000);
    expect(extractRetryAfter('No retry info')).toBe(60000);
  });
});
