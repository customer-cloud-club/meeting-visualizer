/**
 * Gemini API クライアント
 * Nano Banana Pro (gemini-3-pro-image-preview) で全て処理
 * - テキスト分析
 * - 画像生成
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Nano Banana Pro - テキストも画像も両方対応
const MODEL_NAME = 'gemini-3-pro-image-preview';

export interface ImageGenerationResult {
  success: boolean;
  imageData?: Buffer;
  mimeType?: string;
  error?: string;
}

/**
 * テキスト分析（JSON出力）
 */
export async function analyzeWithJSON<T>(
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.3,
      // @ts-ignore
      responseModalities: ['text'],
    },
  });

  const prompt = `${systemPrompt}\n\n${userMessage}`;
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    // JSONパースに失敗した場合、コードブロックを除去して再試行
    let jsonString = text.trim();
    if (jsonString.startsWith('```')) {
      const lines = jsonString.split('\n');
      lines.shift();
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop();
      }
      jsonString = lines.join('\n');
    }
    return JSON.parse(jsonString) as T;
  }
}

/**
 * Nano Banana Pro で画像を生成
 */
export async function generateImage(
  prompt: string
): Promise<ImageGenerationResult> {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        // @ts-ignore
        responseModalities: ['image', 'text'],
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;

    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content.parts;

      for (const part of parts) {
        // @ts-ignore - inlineData exists for image responses
        if (part.inlineData) {
          // @ts-ignore
          const imageData = part.inlineData.data;
          // @ts-ignore
          const mimeType = part.inlineData.mimeType;

          return {
            success: true,
            imageData: Buffer.from(imageData, 'base64'),
            mimeType,
          };
        }
      }
    }

    return {
      success: false,
      error: 'No image in response',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 複数の画像を順番に生成（レート制限対応）
 */
export async function generateImagesSequentially(
  prompts: string[],
  delayMs: number = 3000,
  onProgress?: (current: number, total: number) => void
): Promise<ImageGenerationResult[]> {
  const results: ImageGenerationResult[] = [];

  for (let i = 0; i < prompts.length; i++) {
    if (onProgress) {
      onProgress(i + 1, prompts.length);
    }

    const result = await generateImage(prompts[i]);
    results.push(result);

    // 最後以外は待機
    if (i < prompts.length - 1) {
      await delay(delayMs);
    }
  }

  return results;
}

/**
 * 指定ミリ秒待機
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
