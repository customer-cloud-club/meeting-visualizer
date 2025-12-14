import { describe, it, expect } from 'vitest';
import { estimateSlideCount } from '@/engines/text-analyzer';

describe('text-analyzer', () => {
  describe('estimateSlideCount', () => {
    it('should return 2 for short text', () => {
      const shortText = 'これは短いテキストです。';
      expect(estimateSlideCount(shortText)).toBe(2);
    });

    it('should return 4 for medium text', () => {
      const mediumText = 'あ'.repeat(2000);
      expect(estimateSlideCount(mediumText)).toBe(4);
    });

    it('should return 6 for long text', () => {
      const longText = 'あ'.repeat(4000);
      expect(estimateSlideCount(longText)).toBe(6);
    });

    it('should return 8 for very long text', () => {
      const veryLongText = 'あ'.repeat(8000);
      expect(estimateSlideCount(veryLongText)).toBe(8);
    });

    it('should cap at reasonable number for extremely long text', () => {
      const extremelyLongText = 'あ'.repeat(50000);
      const estimate = estimateSlideCount(extremelyLongText);
      expect(estimate).toBeLessThanOrEqual(12);
    });
  });
});
