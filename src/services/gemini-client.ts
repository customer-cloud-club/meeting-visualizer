/**
 * Gemini API クライアント
 *
 * 認証方式（統一優先順位）:
 * 1. GOOGLE_SERVICE_ACCOUNT_KEY - Vertex AI サービスアカウント（優先）
 * 2. GEMINI_API_KEY - Google AI Studio APIキー（フォールバック）
 * 3. ADC - Application Default Credentials（ローカル開発用）
 *
 * テキスト分析: Vertex AI gemini-2.0-flash-exp
 * 画像生成: Gemini 3 Pro Image (gemini-3-pro-image-preview) のみ使用
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI, Modality } from '@google/genai';
import { VertexAI } from '@google-cloud/vertexai';

// Google AI Studio モデル（APIキー認証）
const GEMINI_AI_STUDIO_MODEL = 'gemini-2.0-flash-exp';

// Vertex AI モデル（テキスト分析用）
const GEMINI_VERTEX_MODEL = 'gemini-2.0-flash-exp';

// Gemini 3 Pro Image - 画像生成専用（Nano Banana Pro）
const GEMINI_3_PRO_IMAGE_MODEL = 'gemini-3-pro-image-preview';

// サービスアカウントキーを使用可能か判定（テキスト分析・画像生成共通）
const USE_SERVICE_ACCOUNT = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

// Vertex AI設定
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0174389307';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

// 認証モード判定
const USE_API_KEY = !!process.env.GEMINI_API_KEY;

/**
 * Google AI Studio クライアントを取得（APIキー認証）
 */
function getGoogleAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Vertex AIインスタンスを取得（サービスアカウント認証）
 */
function getVertexAI(): VertexAI {
  // サービスアカウントキーが環境変数で渡された場合（AWS ECS用）
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const credentials = JSON.parse(serviceAccountKey);
      return new VertexAI({
        project: credentials.project_id || PROJECT_ID,
        location: LOCATION,
        googleAuthOptions: {
          credentials,
        },
      });
    } catch (error) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', error);
    }
  }

  // デフォルト: ADC (Application Default Credentials) を使用
  return new VertexAI({
    project: PROJECT_ID,
    location: LOCATION,
  });
}

/**
 * Google Gen AI クライアントを取得（Gemini 3 Pro Image用）
 */
function getGoogleGenAI(): GoogleGenAI {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      const credentials = JSON.parse(serviceAccountKey);
      return new GoogleGenAI({
        vertexai: true,
        project: credentials.project_id || PROJECT_ID,
        location: LOCATION,
        googleAuthOptions: {
          credentials,
        },
      });
    } catch (error) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY for GenAI:', error);
    }
  }

  // ADC を使用
  return new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });
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
 *
 * 認証優先順位:
 * 1. GOOGLE_SERVICE_ACCOUNT_KEY がある場合: Vertex AI（優先）
 * 2. GEMINI_API_KEY のみの場合: Google AI Studio
 */
export async function analyzeWithJSON<T>(
  systemPrompt: string,
  userMessage: string,
  _apiKey?: string // 後方互換性のため残すが未使用
): Promise<T> {
  const prompt = `${systemPrompt}\n\n${userMessage}`;

  // サービスアカウントキーがある場合はVertex AIを優先
  if (USE_SERVICE_ACCOUNT) {
    console.log('[Text Analysis] Using Vertex AI (service account)');
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: GEMINI_VERTEX_MODEL,
      generationConfig: {
        temperature: 0.3,
        // @ts-ignore - responseModalities is valid for Vertex AI
        responseModalities: ['TEXT'],
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return parseJSONResponse<T>(text);
  }

  // APIキー認証（Google AI Studio）- フォールバック
  if (USE_API_KEY) {
    console.log('[Text Analysis] Using Google AI Studio (API key)');
    const genAI = getGoogleAI();
    const model = genAI.getGenerativeModel({
      model: GEMINI_AI_STUDIO_MODEL,
      generationConfig: {
        temperature: 0.3,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return parseJSONResponse<T>(text);
  }

  // どちらもない場合はADCを使用
  console.log('[Text Analysis] Using Vertex AI (ADC)');
  const vertexAI = getVertexAI();
  const model = vertexAI.getGenerativeModel({
    model: GEMINI_VERTEX_MODEL,
    generationConfig: {
      temperature: 0.3,
      // @ts-ignore - responseModalities is valid for Vertex AI
      responseModalities: ['TEXT'],
    },
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

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
 * Gemini 3 Pro Image (Nano Banana Pro) で画像を生成
 * 高品質なテキストレンダリングと推論強化された画像生成をサポート
 *
 * @google/genai SDK を使用（Gemini 3 Pro Imageには新SDKが必要）
 */
async function generateImageWithGemini3ProImage(prompt: string): Promise<ImageGenerationResult> {
  try {
    console.log('[Image Generation] Using Gemini 3 Pro Image (Nano Banana Pro)');

    const client = getGoogleGenAI();

    const response = await client.models.generateContent({
      model: GEMINI_3_PRO_IMAGE_MODEL,
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    // レスポンスから画像を抽出
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      const parts = candidate.content?.parts || [];

      for (const part of parts) {
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';

          if (imageData) {
            return {
              success: true,
              imageData: Buffer.from(imageData, 'base64'),
              mimeType,
            };
          }
        }
      }
    }

    return {
      success: false,
      error: 'No image in response from Gemini 3 Pro Image',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Image Generation] Gemini 3 Pro Image error:', errorMessage);

    // 404エラー（モデルが見つからない）の検出
    const is404 = errorMessage.includes('404') ||
                  errorMessage.includes('not found') ||
                  errorMessage.includes('NOT_FOUND');

    // 429 Rate Limit / クォータエラーの検出
    const is429 = errorMessage.includes('429') ||
                  errorMessage.includes('Too Many Requests') ||
                  errorMessage.includes('quota') ||
                  errorMessage.includes('RESOURCE_EXHAUSTED');

    // 認証エラーの検出
    const isAuthError = errorMessage.includes('authentication') ||
                        errorMessage.includes('Unauthorized') ||
                        errorMessage.includes('Permission denied');

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
      error: `Gemini 3 Pro Image error: ${errorMessage}`,
      isRateLimited: is429,
      retryAfterMs: is429 ? retryAfterMs : undefined,
    };
  }
}

/**
 * 画像を生成
 *
 * Gemini 3 Pro Image (Nano Banana Pro) のみを使用
 * フォールバックなし - 他のモデルは使用しない
 */
export async function generateImage(
  prompt: string,
  _apiKey?: string // 後方互換性のため残すが未使用
): Promise<ImageGenerationResult> {
  console.log('[Image Generation] Using Gemini 3 Pro Image exclusively');
  return generateImageWithGemini3ProImage(prompt);
}

/**
 * 複数の画像を順番に生成（レート制限対応）
 */
export async function generateImagesSequentially(
  prompts: string[],
  delayMs: number = 3000,
  onProgress?: (current: number, total: number) => void,
  _apiKey?: string // 後方互換性のため残すが未使用
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
