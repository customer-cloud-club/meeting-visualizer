/**
 * テキスト分析結果の型定義
 */

export interface Metaphor {
  concept: string;
  visualRepresentation: string;
  color?: string;
}

export interface TextElement {
  text: string;
  attachedTo: string;
  type: 'label' | 'annotation' | 'title';
}

export interface Topic {
  id: string;
  title: string;
  keyPoints: string[];
  metaphors: Metaphor[];
  visualElements: string[];
  textElements: TextElement[];
  bottomAnnotation: string;
}

export interface AnalysisResult {
  topics: Topic[];
  suggestedSlideCount: number;
  overallTheme: string;
  metadata: {
    inputLength: number;
    analyzedAt: string;
    processingTimeMs: number;
  };
}

export interface AnalysisOptions {
  maxSlides?: number;
  style?: 'default' | 'minimal' | 'detailed';
  language?: 'ja' | 'en';
}
