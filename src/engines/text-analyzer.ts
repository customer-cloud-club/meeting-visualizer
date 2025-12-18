/**
 * テキスト分析エンジン
 * 議事録テキストを構造化データに変換する
 */

import { analyzeWithJSON } from '../services/gemini-client';
import type { AnalysisResult, AnalysisOptions, Topic } from '../types/analysis';

const ANALYSIS_SYSTEM_PROMPT_JA = `あなたは議事録を分析し、図解インフォグラフィックの設計を行う専門家です。

入力された議事録テキストを分析し、以下の形式のJSONで出力してください：

{
  "topics": [
    {
      "id": "topic_01",
      "title": "トピックのタイトル（短く簡潔に）",
      "keyPoints": ["ポイント1", "ポイント2", "ポイント3"],
      "metaphors": [
        {
          "concept": "抽象的な概念",
          "visualRepresentation": "視覚的な表現（例：山を登る棒人間）",
          "color": "使用する色（例：blue, orange）"
        }
      ],
      "visualElements": ["視覚要素1", "視覚要素2"],
      "textElements": [
        {
          "text": "ラベルテキスト",
          "attachedTo": "どこに付けるか",
          "type": "label"
        }
      ],
      "bottomAnnotation": "図の下部に表示する要約文"
    }
  ],
  "suggestedSlideCount": 4,
  "overallTheme": "全体のテーマ・メッセージ"
}

ルール：
1. 各トピックは1枚の図解になる
2. keyPointsは3-5個に絞る
3. metaphorsは視覚的にわかりやすいものを選ぶ（棒人間、アイコン、矢印など）
4. textElementsは日本語で、簡潔に
5. 指定された枚数ぴったりのトピックを生成すること（重要！）
6. 全体の流れ・ストーリーを意識する
7. 内容が少なくても、異なる切り口・視点から分割して指定枚数にすること

重要：必ずJSONのみを出力してください。説明文は不要です。`;

const ANALYSIS_SYSTEM_PROMPT_EN = `You are an expert in analyzing meeting minutes and designing infographic illustrations.

Analyze the input meeting text and output in the following JSON format:

{
  "topics": [
    {
      "id": "topic_01",
      "title": "Topic title (short and concise)",
      "keyPoints": ["Point 1", "Point 2", "Point 3"],
      "metaphors": [
        {
          "concept": "Abstract concept",
          "visualRepresentation": "Visual representation (e.g., stick figure climbing a mountain)",
          "color": "Color to use (e.g., blue, orange)"
        }
      ],
      "visualElements": ["Visual element 1", "Visual element 2"],
      "textElements": [
        {
          "text": "Label text",
          "attachedTo": "Where to attach",
          "type": "label"
        }
      ],
      "bottomAnnotation": "Summary text at the bottom of the figure"
    }
  ],
  "suggestedSlideCount": 4,
  "overallTheme": "Overall theme/message"
}

Rules:
1. Each topic becomes one infographic
2. Keep keyPoints to 3-5 items
3. Choose metaphors that are visually clear (stick figures, icons, arrows, etc.)
4. textElements should be in English and concise
5. Generate exactly the specified number of topics (Important!)
6. Be aware of the overall flow and story
7. Even if content is limited, split into the specified number using different perspectives

Important: Output only JSON. No explanations needed.`;

/**
 * 議事録テキストを分析し、構造化データに変換
 */
export async function analyzeText(
  text: string,
  options?: AnalysisOptions
): Promise<AnalysisResult> {
  const startTime = Date.now();

  // テキストの前処理
  const cleanedText = preprocessText(text);

  // 最大枚数の制約を追加
  const maxSlides = options?.maxSlides ?? 8;
  const language = options?.language ?? 'ja';
  const styleHint = getStyleHint(options?.style ?? 'default', language);

  // Choose system prompt based on language
  const systemPrompt = language === 'en' ? ANALYSIS_SYSTEM_PROMPT_EN : ANALYSIS_SYSTEM_PROMPT_JA;

  const userPrompt = language === 'en'
    ? `Please analyze the following meeting minutes.

Constraints:
- Split into exactly ${maxSlides} infographics (This is mandatory)
- The topics array must contain exactly ${maxSlides} elements
- Style: ${styleHint}
- Even if content is limited, split into ${maxSlides} using different perspectives

---
${cleanedText}
---`
    : `以下の議事録を分析してください。

制約：
- 必ず${maxSlides}枚ぴったりの図解に分割してください（これは絶対条件です）
- topicsの配列は必ず${maxSlides}個の要素を含むこと
- スタイル: ${styleHint}
- 内容が少なくても、異なる視点・切り口から${maxSlides}枚に分割すること

---
${cleanedText}
---`;

  // Claude APIで分析
  const rawResult = await analyzeWithJSON<{
    topics: Topic[];
    suggestedSlideCount: number;
    overallTheme: string;
  }>(systemPrompt, userPrompt, options?.apiKey);

  // 結果を整形
  const result: AnalysisResult = {
    topics: rawResult.topics.slice(0, maxSlides),
    suggestedSlideCount: Math.min(rawResult.suggestedSlideCount, maxSlides),
    overallTheme: rawResult.overallTheme,
    metadata: {
      inputLength: text.length,
      analyzedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
    },
  };

  return result;
}

/**
 * テキストの前処理
 */
function preprocessText(text: string): string {
  return text
    // 連続する空白行を1つに
    .replace(/\n{3,}/g, '\n\n')
    // 先頭・末尾の空白を削除
    .trim()
    // 長すぎる場合は切り詰め（200,000文字 = 約2時間の会議）
    .slice(0, 200000);
}

/**
 * スタイルに応じたヒントを生成
 */
function getStyleHint(style: 'default' | 'minimal' | 'detailed', language: 'ja' | 'en' = 'ja'): string {
  if (language === 'en') {
    switch (style) {
      case 'minimal':
        return 'Minimal elements, simple expression. Only 1-2 main visuals per infographic.';
      case 'detailed':
        return 'Detailed expression. Include multiple sub-elements, annotations, comparison charts.';
      default:
        return 'Balanced standard expression. Main visual + supplementary elements.';
    }
  }

  switch (style) {
    case 'minimal':
      return '最小限の要素で、シンプルに表現。各図解に1-2個のメインビジュアルのみ。';
    case 'detailed':
      return '詳細に表現。複数のサブ要素、注釈、比較図などを含む。';
    default:
      return 'バランスの取れた標準的な表現。メインビジュアル+補足要素。';
  }
}

/**
 * 図解の推奨枚数を判定
 */
export function estimateSlideCount(text: string): number {
  const length = text.length;
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;

  // テキスト長とパラグラフ数から推定
  if (length < 1000) return 2;
  if (length < 3000) return 4;
  if (length < 5000) return 6;
  if (length < 10000) return 8;
  return Math.min(Math.ceil(paragraphs / 3), 12);
}
