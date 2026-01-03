import { describe, it, expect } from 'vitest';
import { generateYAMLPrompts, formatYAMLForSave } from '@/engines/yaml-generator';
import type { AnalysisResult, Topic } from '@/types/analysis';

describe('yaml-generator', () => {
  const mockTopic: Topic = {
    id: 'topic_01',
    title: 'テストトピック',
    keyPoints: ['ポイント1', 'ポイント2', 'ポイント3'],
    metaphors: [
      {
        concept: 'チームワーク',
        visualRepresentation: '歯車が噛み合う図',
        color: 'blue',
      },
    ],
    visualElements: ['矢印', 'フローチャート'],
    textElements: [
      {
        text: 'ラベル1',
        attachedTo: 'メイン図形',
        type: 'label',
      },
    ],
    bottomAnnotation: '要約テキスト',
  };

  const mockAnalysis: AnalysisResult = {
    topics: [mockTopic],
    suggestedSlideCount: 1,
    overallTheme: 'チーム協力の重要性',
    metadata: {
      inputLength: 1000,
      analyzedAt: '2024-01-01T00:00:00Z',
      processingTimeMs: 500,
    },
  };

  describe('generateYAMLPrompts', () => {
    it('should generate prompts for all topics', () => {
      const prompts = generateYAMLPrompts(mockAnalysis);

      expect(prompts).toHaveLength(1);
      expect(prompts[0].id).toBe('slide_01');
      expect(prompts[0].title).toBe('テストトピック');
    });

    it('should include art style section', () => {
      const prompts = generateYAMLPrompts(mockAnalysis);

      expect(prompts[0].prompt).toContain('ART STYLE');
      expect(prompts[0].prompt).toContain('Graphic Recording');
      expect(prompts[0].prompt).toContain('Hand-drawn Sketch');
    });

    it('should include Japanese text labels', () => {
      const prompts = generateYAMLPrompts(mockAnalysis);

      expect(prompts[0].prompt).toContain('TEXT LABELS (MUST INCLUDE)');
      expect(prompts[0].prompt).toContain('テストトピック');
    });

    it('should include metaphor visual representation', () => {
      const prompts = generateYAMLPrompts(mockAnalysis);

      expect(prompts[0].prompt).toContain('歯車が噛み合う図');
    });

    it('should include bottom annotation', () => {
      const prompts = generateYAMLPrompts(mockAnalysis);

      expect(prompts[0].prompt).toContain('要約テキスト');
    });
  });

  describe('formatYAMLForSave', () => {
    it('should format prompts for file saving', () => {
      const prompts = generateYAMLPrompts(mockAnalysis);
      const formatted = formatYAMLForSave(prompts);

      expect(formatted).toContain('# slide_01:');
      expect(formatted).toContain('テストトピック');
    });

    it('should separate multiple prompts with dividers', () => {
      const multiTopicAnalysis: AnalysisResult = {
        ...mockAnalysis,
        topics: [mockTopic, { ...mockTopic, id: 'topic_02', title: 'トピック2' }],
      };

      const prompts = generateYAMLPrompts(multiTopicAnalysis);
      const formatted = formatYAMLForSave(prompts);

      expect(formatted).toContain('---');
      expect(formatted).toContain('slide_01');
      expect(formatted).toContain('slide_02');
    });
  });

  describe('layout estimation', () => {
    it('should suggest split layout for multiple metaphors', () => {
      const topicWithMultipleMetaphors: Topic = {
        ...mockTopic,
        metaphors: [
          { concept: 'A', visualRepresentation: 'A図', color: 'blue' },
          { concept: 'B', visualRepresentation: 'B図', color: 'red' },
        ],
      };

      const analysis: AnalysisResult = {
        ...mockAnalysis,
        topics: [topicWithMultipleMetaphors],
      };

      const prompts = generateYAMLPrompts(analysis);
      expect(prompts[0].prompt).toContain('Split comparison');
    });

    it('should suggest grid layout for many key points', () => {
      const topicWithManyPoints: Topic = {
        ...mockTopic,
        metaphors: [],
        keyPoints: ['1', '2', '3', '4', '5'],
      };

      const analysis: AnalysisResult = {
        ...mockAnalysis,
        topics: [topicWithManyPoints],
      };

      const prompts = generateYAMLPrompts(analysis);
      expect(prompts[0].prompt).toContain('Grid');
    });
  });
});
