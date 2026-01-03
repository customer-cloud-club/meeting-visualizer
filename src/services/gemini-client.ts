/**
 * Gemini API クライアント
 * Nano Banana Pro (gemini-3-pro-image-preview) で全て処理
 * - テキスト分析
 * - 画像生成
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Nano Banana Pro - テキストも画像も両方対応
const MODEL_NAME = 'gemini-3-pro-image-preview';

/**
 * APIキーからGenAIインスタンスを取得
 * 優先順位: 1. クライアントから渡されたAPIキー 2. 環境変数 GEMINI_API_KEY
 */
function getGenAI(apiKey?: string): GoogleGenerativeAI {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Gemini API key is not configured. Please contact administrator or set GEMINI_API_KEY environment variable.');
  }
  return new GoogleGenerativeAI(key);
}

export interface ImageGenerationResult {
  success: boolean;
  imageData?: Buffer;
  mimeType?: string;
  error?: string;
  isRateLimited?: boolean;
  retryAfterMs?: number;
}

/**
 * テキスト分析（JSON出力）
 */
export async function analyzeWithJSON<T>(
  systemPrompt: string,
  userMessage: string,
  apiKey?: string
): Promise<T> {
  const genAI = getGenAI(apiKey);
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

  return parseJSONResponse<T>(text);
}

/**
 * AIレスポンスからJSONを抽出してパース
 */
function parseJSONResponse<T>(text: string): T {
  // Step 1: そのままパースを試みる
  try {
    return JSON.parse(text) as T;
  } catch {
    // 続行
  }

  // Step 2: マークダウンコードブロックを除去
  let jsonString = text.trim();

  // ```json または ``` で囲まれている場合
  const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim();
    try {
      return JSON.parse(jsonString) as T;
    } catch {
      // 続行
    }
  }

  // Step 3: JSONの開始位置と終了位置を探す
  const firstBrace = jsonString.indexOf('{');
  const lastBrace = jsonString.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonString = jsonString.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonString) as T;
    } catch {
      // 続行
    }
  }

  // Step 4: よくあるJSON問題を修正
  // 末尾のカンマを除去
  jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
  // 改行を含む文字列値を修正
  jsonString = jsonString.replace(/:\s*"([^"]*)\n([^"]*)"/g, ': "$1\\n$2"');

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    // デバッグ用にエラーログを出力
    console.error('JSON Parse Error. Raw text length:', text.length);
    console.error('Extracted JSON length:', jsonString.length);
    console.error('First 500 chars:', jsonString.slice(0, 500));
    console.error('Last 500 chars:', jsonString.slice(-500));
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Nano Banana Pro で画像を生成
 */
export async function generateImage(
  prompt: string,
  apiKey?: string
): Promise<ImageGenerationResult> {
  try {
    const genAI = getGenAI(apiKey);
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // 429 Rate Limit エラーの検出
    const is429 = errorMessage.includes('429') ||
                  errorMessage.includes('Too Many Requests') ||
                  errorMessage.includes('quota');

    // retryDelay の抽出（例: "Please retry in 36s"）
    let retryAfterMs = 60000; // デフォルト60秒
    const retryMatch = errorMessage.match(/retry in (\d+)(?:\.(\d+))?s/i);
    if (retryMatch) {
      const seconds = parseInt(retryMatch[1], 10);
      const fraction = retryMatch[2] ? parseInt(retryMatch[2], 10) / Math.pow(10, retryMatch[2].length) : 0;
      retryAfterMs = Math.ceil((seconds + fraction) * 1000);
    }

    return {
      success: false,
      error: errorMessage,
      isRateLimited: is429,
      retryAfterMs: is429 ? retryAfterMs : undefined,
    };
  }
}

/**
 * 複数の画像を順番に生成（レート制限対応）
 */
export async function generateImagesSequentially(
  prompts: string[],
  delayMs: number = 3000,
  onProgress?: (current: number, total: number) => void,
  apiKey?: string
): Promise<ImageGenerationResult[]> {
  const results: ImageGenerationResult[] = [];

  for (let i = 0; i < prompts.length; i++) {
    if (onProgress) {
      onProgress(i + 1, prompts.length);
    }

    const result = await generateImage(prompts[i], apiKey);
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
