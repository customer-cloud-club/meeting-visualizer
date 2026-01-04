/**
 * YAML生成エンジン
 * 構造化データからNano Banana Pro用YAMLプロンプトを生成
 *
 * プロンプト標準化: Issue #44
 * Structured Hand-Drawn Infographic Output Format を使用
 */

import type { AnalysisResult, Topic } from '../types/analysis';
import {
  DEFAULT_IMAGE_STYLE,
  buildGlobalStylePrompt,
  type ImagePromptConfig,
} from '../config/image-prompt-template';

export interface YAMLPrompt {
  id: string;
  title: string;
  prompt: string;
}

type Language = 'ja' | 'en';

/**
 * 分析結果から複数のYAMLプロンプトを生成
 *
 * @param analysis 分析結果
 * @param language 言語設定 (ja/en)
 * @param styleConfig カスタムスタイル設定（オプション）
 */
export function generateYAMLPrompts(
  analysis: AnalysisResult,
  language: Language = 'ja',
  styleConfig?: ImagePromptConfig
): YAMLPrompt[] {
  // スタイル設定をマージ（デフォルト + カスタム）
  const config: ImagePromptConfig = styleConfig
    ? { ...DEFAULT_IMAGE_STYLE, ...styleConfig, language }
    : { ...DEFAULT_IMAGE_STYLE, language };

  return analysis.topics.map((topic, index) =>
    generateSinglePrompt(topic, index, analysis.overallTheme, language, config)
  );
}

/**
 * 単一トピックからYAMLプロンプトを生成
 *
 * Issue #44: Structured Hand-Drawn Infographic Output Format を使用
 */
function generateSinglePrompt(
  topic: Topic,
  index: number,
  overallTheme: string,
  language: Language,
  config: ImagePromptConfig
): YAMLPrompt {
  const id = `slide_${String(index + 1).padStart(2, '0')}`;

  // グローバルスタイル定義を取得（Issue #44 標準フォーマット）
  const globalStyle = buildGlobalStylePrompt(config);

  // ビジュアル要素の説明を構築
  const visualDescription = buildVisualDescription(topic);

  // テキストラベルを構築
  const textLabels = buildTextLabels(topic, language);

  // 構図の説明を構築
  const compositionDescription = buildComposition(topic);

  // Language-specific instruction
  const languageInstruction = language === 'en'
    ? `Create a hand-drawn infographic illustration in English.`
    : `Create a hand-drawn infographic illustration in Japanese.`;

  // 標準化されたプロンプト構造（Issue #44準拠）
  const prompt = `${languageInstruction}

${globalStyle}

=== VISUAL ELEMENTS ===
${visualDescription}

=== TEXT LABELS (MUST INCLUDE) ===
${textLabels}

=== COMPOSITION ===
${compositionDescription}

=== OVERALL THEME ===
${overallTheme}

=== GENERATION INSTRUCTIONS ===
Generate a hand-drawn infographic illustration following the above specifications.
The image should look like a friendly, approachable sketch that explains complex concepts
using visual metaphors. Embrace imperfection and human touch in the drawing style.`;

  return {
    id,
    title: topic.title,
    prompt,
  };
}

/**
 * ビジュアル要素の説明を構築
 */
function buildVisualDescription(topic: Topic): string {
  const parts: string[] = [];

  // メインサブジェクト（メタファーから）
  if (topic.metaphors.length > 0) {
    const mainMetaphor = topic.metaphors[0];
    parts.push(`Main Subject: ${mainMetaphor.visualRepresentation}`);
    parts.push(`Concept: ${mainMetaphor.concept}`);
    if (mainMetaphor.color) {
      parts.push(`Color Emphasis: ${mainMetaphor.color}`);
    }
  }

  // サポート要素
  if (topic.visualElements.length > 0) {
    parts.push(`Supporting Elements: ${topic.visualElements.join(', ')}`);
  }

  // 追加のメタファー
  if (topic.metaphors.length > 1) {
    const additionalMetaphors = topic.metaphors.slice(1);
    parts.push(
      `Additional Visuals: ${additionalMetaphors.map(m => m.visualRepresentation).join(', ')}`
    );
  }

  // キーポイントからの要素
  if (topic.keyPoints.length > 0) {
    parts.push(`Key Concepts to Visualize:`);
    topic.keyPoints.forEach((point, i) => {
      parts.push(`  ${i + 1}. ${point}`);
    });
  }

  return parts.join('\n');
}

/**
 * テキストラベルを構築
 */
function buildTextLabels(topic: Topic, language: Language): string {
  const labels: string[] = [];

  const titlePosition = language === 'en' ? 'Title position' : 'タイトル位置';
  const relatedElement = language === 'en' ? 'Related visual element' : '関連ビジュアル要素';

  // タイトル
  labels.push(`- "${topic.title}" → ${titlePosition}`);

  // テキスト要素から
  topic.textElements.forEach((elem) => {
    labels.push(`- "${elem.text}" → ${elem.attachedTo}`);
  });

  // キーポイントからラベル生成（最大3つ）
  topic.keyPoints.slice(0, 3).forEach((point) => {
    const shortLabel = point.length > 15 ? point.slice(0, 15) + '...' : point;
    labels.push(`- "${shortLabel}" → ${relatedElement}`);
  });

  // ボトムアノテーション
  if (topic.bottomAnnotation) {
    const annotationLabel = language === 'en' ? 'Bottom annotation' : '下部注釈';
    labels.push(`\n${annotationLabel}: "${topic.bottomAnnotation}"`);
  }

  return labels.join('\n');
}

/**
 * 構図の説明を構築
 */
function buildComposition(topic: Topic): string {
  const parts: string[] = [];

  // レイアウト推定
  const layoutType = estimateLayoutType(topic);
  parts.push(`Layout: ${layoutType}`);

  // フォーカルポイント
  if (topic.metaphors.length > 0) {
    parts.push(`Focal Point: ${topic.metaphors[0].visualRepresentation}`);
  }

  // 強調技法
  parts.push(`Emphasis: Size contrast, color highlights, arrows for flow`);

  return parts.join('\n');
}

/**
 * レイアウトタイプを推定
 */
function estimateLayoutType(topic: Topic): string {
  const keyPointCount = topic.keyPoints.length;
  const metaphorCount = topic.metaphors.length;

  if (metaphorCount >= 2) {
    return 'Split comparison (Left vs Right) or Before/After';
  }

  if (keyPointCount >= 4) {
    return 'Grid or Multi-section layout';
  }

  if (keyPointCount === 3) {
    return 'Three-column or Triangle layout';
  }

  if (keyPointCount <= 2) {
    return 'Center-focused with supporting elements';
  }

  return 'Left-to-Right flow';
}

/**
 * YAMLプロンプトをファイル保存用の文字列に変換
 */
export function formatYAMLForSave(prompts: YAMLPrompt[]): string {
  return prompts
    .map((p) => `# ${p.id}: ${p.title}\n\n${p.prompt}`)
    .join('\n\n---\n\n');
}
