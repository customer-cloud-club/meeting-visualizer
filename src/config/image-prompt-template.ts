/**
 * 画像生成プロンプトテンプレート
 *
 * Structured Hand-Drawn Infographic Output Format (YAML Definition)
 * Issue #44: https://github.com/customer-cloud-club/meeting-visualizer/issues/44
 *
 * このフォーマットは、複雑な概念を親しみやすい手書き風のビジュアルメタファーを用いて、
 * 連続した画像で段階的に解説するための標準化された構造定義です。
 */

export interface ImagePromptConfig {
  language: 'ja' | 'en';
  artStyle: ArtStyleConfig;
  colorPalette: ColorPaletteConfig;
  basicVisualElements: BasicVisualElementsConfig;
}

export interface ArtStyleConfig {
  primaryAesthetic: string;
  textureReference: string;
  overallVibe: string;
  imperfectionLevel: string;
}

export interface ColorPaletteConfig {
  background: string;
  primaryColors: {
    textAndOutlines: string;
    emphasisAttention: string;
    structureSafety: string;
    criticalWarning: string;
  };
  colorUsageRule: string;
}

export interface BasicVisualElementsConfig {
  characters: string;
  connectors: string;
  containers: string;
  typography: string;
}

/**
 * デフォルトの画像生成スタイル設定
 */
export const DEFAULT_IMAGE_STYLE: ImagePromptConfig = {
  language: 'ja',
  artStyle: {
    primaryAesthetic: 'Graphic Recording / Hand-drawn Sketch / Whiteboard Art',
    textureReference: 'Marker pens, crayons, and colored pencils on paper texture',
    overallVibe: "Friendly, soft, approachable, 'Junior High School Student's Notebook' feel",
    imperfectionLevel: 'High - embrace rough lines, slight smudges, and human touch. Not polished digital art.',
  },
  colorPalette: {
    background: 'Clean white or off-white paper texture',
    primaryColors: {
      textAndOutlines: 'Black or dark charcoal marker',
      emphasisAttention: 'Yellow / Orange (marker/crayon texture)',
      structureSafety: 'Blue / Green (marker/crayon texture)',
      criticalWarning: 'Red (marker/crayon texture)',
    },
    colorUsageRule: 'Use colors sparingly for accents and meaning, keeping the base simple.',
  },
  basicVisualElements: {
    characters: 'Simple stick figures with expressive faces',
    connectors: 'Hand-drawn arrows with varied thickness and texture indicating flow or relationship',
    containers: 'Hand-drawn boxes, circles, clouds, or speech bubbles for grouping information',
    typography: 'Handwritten, slightly messy Japanese script, easy to read but authentic to the style',
  },
};

/**
 * グローバルスタイル定義をプロンプト文字列に変換
 */
export function buildGlobalStylePrompt(config: ImagePromptConfig = DEFAULT_IMAGE_STYLE): string {
  const languageNote = config.language === 'ja'
    ? 'CRITICAL: All text labels MUST be written in Japanese hiragana/katakana/kanji. The text must be clearly readable.'
    : 'CRITICAL: All text labels MUST be written in English. The text must be clearly readable.';

  return `=== GLOBAL STYLE DEFINITION ===

--- ART STYLE ---
Primary Aesthetic: ${config.artStyle.primaryAesthetic}
Texture Reference: ${config.artStyle.textureReference}
Overall Vibe: ${config.artStyle.overallVibe}
Imperfection Level: ${config.artStyle.imperfectionLevel}

--- COLOR PALETTE ---
Background: ${config.colorPalette.background}
Primary Colors:
  - Text and Outlines: ${config.colorPalette.primaryColors.textAndOutlines}
  - Emphasis/Attention: ${config.colorPalette.primaryColors.emphasisAttention}
  - Structure/Safety: ${config.colorPalette.primaryColors.structureSafety}
  - Critical/Warning: ${config.colorPalette.primaryColors.criticalWarning}
Color Usage Rule: ${config.colorPalette.colorUsageRule}

--- BASIC VISUAL ELEMENTS ---
Characters: ${config.basicVisualElements.characters}
Connectors: ${config.basicVisualElements.connectors}
Containers: ${config.basicVisualElements.containers}
Typography: ${config.basicVisualElements.typography}

${languageNote}`;
}

/**
 * 完全なプロンプトテンプレートを生成
 */
export function buildFullPromptTemplate(
  visualElements: {
    mainSubjectMetaphor: string;
    supportingElements: string;
    backgroundSetting?: string;
    stateDescription?: string;
  },
  textElements: {
    mainLabels: Array<{ text: string; attachedTo: string }>;
    explanatoryAnnotation?: string;
  },
  compositionAndEmphasis: {
    layoutStructure: string;
    focalPoint: string;
    emphasisTechnique: string;
  },
  styleApplicationNotes?: {
    textureFocus?: string;
    colorPaletteUsage?: string;
    moodDirection?: string;
  },
  config: ImagePromptConfig = DEFAULT_IMAGE_STYLE
): string {
  const globalStyle = buildGlobalStylePrompt(config);

  const visualSection = `=== VISUAL ELEMENTS ===
Main Subject Metaphor: ${visualElements.mainSubjectMetaphor}
Supporting Elements: ${visualElements.supportingElements}
${visualElements.backgroundSetting ? `Background Setting: ${visualElements.backgroundSetting}` : ''}
${visualElements.stateDescription ? `State Description: ${visualElements.stateDescription}` : ''}`;

  const textSection = `=== TEXT ELEMENTS ===
Main Labels:
${textElements.mainLabels.map((label) => `  - "${label.text}" → ${label.attachedTo}`).join('\n')}
${textElements.explanatoryAnnotation ? `\nExplanatory Annotation: "${textElements.explanatoryAnnotation}"` : ''}`;

  const compositionSection = `=== COMPOSITION & EMPHASIS ===
Layout Structure: ${compositionAndEmphasis.layoutStructure}
Focal Point: ${compositionAndEmphasis.focalPoint}
Emphasis Technique: ${compositionAndEmphasis.emphasisTechnique}`;

  let styleNotes = '';
  if (styleApplicationNotes) {
    styleNotes = `\n=== STYLE APPLICATION NOTES ===
${styleApplicationNotes.textureFocus ? `Texture Focus: ${styleApplicationNotes.textureFocus}` : ''}
${styleApplicationNotes.colorPaletteUsage ? `Color Palette Usage: ${styleApplicationNotes.colorPaletteUsage}` : ''}
${styleApplicationNotes.moodDirection ? `Mood Direction: ${styleApplicationNotes.moodDirection}` : ''}`;
  }

  return `${globalStyle}

${visualSection}

${textSection}

${compositionSection}
${styleNotes}

=== GENERATION INSTRUCTIONS ===
Generate a hand-drawn infographic illustration following the above specifications.
The image should look like a friendly, approachable sketch that explains complex concepts
using visual metaphors. Embrace imperfection and human touch in the drawing style.`;
}
