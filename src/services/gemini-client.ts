/**
 * Gemini API クライアント
 *
 * 認証方式（優先順位）:
 * 1. GEMINI_API_KEY - Google AI Studio APIキー（推奨）
 * 2. GOOGLE_SERVICE_ACCOUNT_KEY - Vertex AI サービスアカウント
 * 3. ADC - Application Default Credentials（ローカル開発用）
 *
 * 画像生成モデル:
 * - gemini-2.0-flash-exp（Google AI Studio）
 * - Imagen 3（Vertex AI、フォールバック）
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { VertexAI } from '@google-cloud/vertexai';
import * as aiplatform from '@google-cloud/aiplatform';

const { PredictionServiceClient } = aiplatform.v1;
const { helpers } = aiplatform;

// Google AI Studio モデル（APIキー認証）
const GEMINI_AI_STUDIO_MODEL = 'gemini-2.0-flash-exp';

// Vertex AI モデル
const GEMINI_VERTEX_MODEL = 'gemini-2.0-flash-exp';

// Imagen 3 - 画像生成専用（Vertex AIフォールバック用）
const IMAGEN_MODEL = 'imagen-3.0-generate-001';

// Vertex AI設定
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0174389307';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

// 画像生成モデル選択（環境変数で切り替え可能）
// 'gemini' | 'imagen' | 'auto' (auto: Geminiで失敗したらImagenにフォールバック)
const IMAGE_MODEL_STRATEGY = process.env.IMAGE_MODEL_STRATEGY || 'auto';

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

export interface ImageGenerationResult {
  success: boolean;
  imageData?: Buffer;
  mimeType?: string;
  error?: string;
  isRateLimited?: boolean;
  retryAfterMs?: number;
}

/**
 * PredictionServiceClientを取得（Imagen用）
 */
function getPredictionClient(): InstanceType<typeof PredictionServiceClient> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      const credentials = JSON.parse(serviceAccountKey);
      return new PredictionServiceClient({
        apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
        credentials,
      });
    } catch (error) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY for Imagen:', error);
    }
  }

  return new PredictionServiceClient({
    apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
  });
}

/**
 * テキスト分析（JSON出力）
 */
export async function analyzeWithJSON<T>(
  systemPrompt: string,
  userMessage: string,
  _apiKey?: string // 後方互換性のため残すが未使用
): Promise<T> {
  const prompt = `${systemPrompt}\n\n${userMessage}`;

  // APIキー認証（Google AI Studio）
  if (USE_API_KEY) {
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

  // Vertex AI（サービスアカウント/ADC認証）
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
 * Gemini で画像を生成
 * APIキーモードとVertex AIモードの両方に対応
 */
async function generateImageWithGemini(prompt: string): Promise<ImageGenerationResult> {
  try {
    // APIキー認証（Google AI Studio）
    if (USE_API_KEY) {
      console.log('[Image Generation] Using Google AI Studio with API key');
      const genAI = getGoogleAI();
      const model = genAI.getGenerativeModel({
        model: GEMINI_AI_STUDIO_MODEL,
        generationConfig: {
          // @ts-ignore - responseModalities may be available
          responseModalities: ['IMAGE', 'TEXT'],
        },
      });

      const result = await model.generateContent(prompt);
      const response = result.response;

      // レスポンスからインライン画像を探す
      const candidates = response.candidates;
      if (candidates && candidates[0]) {
        const parts = candidates[0].content?.parts || [];
        for (const part of parts) {
          // @ts-ignore - inlineData may exist
          if (part.inlineData) {
            // @ts-ignore
            const imageData = part.inlineData.data;
            // @ts-ignore
            const mimeType = part.inlineData.mimeType || 'image/png';

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
        error: 'No image in response from Google AI Studio',
      };
    }

    // Vertex AI（サービスアカウント/ADC認証）
    console.log('[Image Generation] Using Vertex AI');
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: GEMINI_VERTEX_MODEL,
      generationConfig: {
        // @ts-ignore - responseModalities is valid for Vertex AI
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const response = result.response;

    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content?.parts || [];

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
      error: 'No image in response from Gemini',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // 認証エラーの検出
    const isAuthError = errorMessage.includes('GoogleAuthError') ||
                        errorMessage.includes('Unable to authenticate') ||
                        errorMessage.includes('authentication');

    // 429 Rate Limit / クォータエラーの検出
    const is429 = errorMessage.includes('429') ||
                  errorMessage.includes('Too Many Requests') ||
                  errorMessage.includes('quota') ||
                  errorMessage.includes('RESOURCE_EXHAUSTED') ||
                  errorMessage.includes('limit: 0');

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
      isRateLimited: is429 || isAuthError, // 認証エラーもフォールバック対象
      retryAfterMs: is429 ? retryAfterMs : undefined,
    };
  }
}

/**
 * Imagen 3 で画像を生成（フォールバック用）
 */
async function generateImageWithImagen(prompt: string): Promise<ImageGenerationResult> {
  try {
    const client = getPredictionClient();

    const projectId = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY).project_id
      : PROJECT_ID;

    const endpoint = `projects/${projectId}/locations/${LOCATION}/publishers/google/models/${IMAGEN_MODEL}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instanceValue = helpers.toValue({ prompt }) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parametersValue = helpers.toValue({
      sampleCount: 1,
      aspectRatio: '16:9', // ワイドスクリーン形式
      safetyFilterLevel: 'block_some',
      personGeneration: 'allow_adult',
    }) as any;

    const request = {
      endpoint,
      instances: [instanceValue],
      parameters: parametersValue,
    };

    const [response] = await client.predict(request);

    if (response.predictions && response.predictions.length > 0) {
      const prediction = response.predictions[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const predictionObj = prediction as any;
      const fields = predictionObj?.structValue?.fields;

      if (fields?.bytesBase64Encoded?.stringValue) {
        const imageData = Buffer.from(fields.bytesBase64Encoded.stringValue, 'base64');
        return {
          success: true,
          imageData,
          mimeType: 'image/png',
        };
      }
    }

    return {
      success: false,
      error: 'No image in response from Imagen',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const is429 = errorMessage.includes('429') ||
                  errorMessage.includes('Too Many Requests') ||
                  errorMessage.includes('quota') ||
                  errorMessage.includes('RESOURCE_EXHAUSTED');

    return {
      success: false,
      error: `Imagen error: ${errorMessage}`,
      isRateLimited: is429,
      retryAfterMs: is429 ? 60000 : undefined,
    };
  }
}

/**
 * 画像を生成（戦略に基づいてモデルを選択）
 *
 * 戦略:
 * - 'gemini': Gemini 3 Pro Image Previewのみ使用
 * - 'imagen': Imagen 3のみ使用
 * - 'auto': Geminiで失敗したらImagenにフォールバック（デフォルト）
 */
export async function generateImage(
  prompt: string,
  _apiKey?: string // 後方互換性のため残すが未使用
): Promise<ImageGenerationResult> {
  const strategy = IMAGE_MODEL_STRATEGY;

  // Imagenのみ使用
  if (strategy === 'imagen') {
    console.log('[Image Generation] Using Imagen 3');
    return generateImageWithImagen(prompt);
  }

  // Geminiのみ使用
  if (strategy === 'gemini') {
    console.log('[Image Generation] Using Gemini 3 Pro Image Preview');
    return generateImageWithGemini(prompt);
  }

  // auto: GeminiでクォータエラーならImagenにフォールバック
  console.log('[Image Generation] Trying Gemini 3 Pro Image Preview...');
  const geminiResult = await generateImageWithGemini(prompt);

  if (geminiResult.success) {
    return geminiResult;
  }

  // クォータ/レート制限エラーの場合、Imagenにフォールバック
  if (geminiResult.isRateLimited || geminiResult.error?.includes('limit: 0')) {
    console.log('[Image Generation] Gemini quota exhausted, falling back to Imagen 3...');
    return generateImageWithImagen(prompt);
  }

  // その他のエラーはGeminiの結果をそのまま返す
  return geminiResult;
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
