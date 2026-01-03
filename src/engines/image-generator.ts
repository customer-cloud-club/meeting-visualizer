/**
 * 画像生成エンジン
 * YAMLプロンプトからNano Banana Proで画像を生成し、S3に保存
 */

import { generateImage } from '../services/gemini-client';
import { isJobCancelled } from '../lib/job-store';
import {
  uploadImageToS3,
  saveImageMetadata,
  generateS3Key,
  getAnonymousUserId,
} from '../lib/aws-clients';
import type { YAMLPrompt } from './yaml-generator';
import type { ImageResult, GenerationOptions, GenerationProgress } from '../types/image';

export class JobCancelledError extends Error {
  constructor(jobId: string) {
    super(`Job ${jobId} was cancelled`);
    this.name = 'JobCancelledError';
  }
}

/**
 * 指数バックオフ計算（ジッター付き）
 * @param attempt リトライ回数（0から開始）
 * @param baseDelayMs 基本待機時間（ミリ秒）
 * @param maxDelayMs 最大待機時間（ミリ秒）
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number = 5000,
  maxDelayMs: number = 120000
): number {
  // 指数バックオフ: base * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  // 最大値で制限
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  // ジッター追加（±25%）
  const jitter = cappedDelay * (0.75 + Math.random() * 0.5);
  return Math.floor(jitter);
}

/**
 * 複数のYAMLプロンプトから画像を生成しS3に保存
 *
 * Gemini APIレート制限対策:
 * - 順次処理（同時リクエストなし）
 * - 指数バックオフリトライ
 * - 連続レート制限時の待機時間延長
 * - デフォルト待機時間10秒（プレビューモデル対応）
 */
export async function generateImages(
  prompts: YAMLPrompt[],
  options: GenerationOptions & { jobId?: string; userId?: string },
  onProgress?: (progress: GenerationProgress) => void
): Promise<ImageResult[]> {
  // レート制限対策: プレビューモデル向けに待機時間を増加
  // gemini-3-pro-image-preview は RPM: 10-50 と厳しいため、安全マージンを確保
  const { delayBetweenRequests = 10000, retryCount = 6, jobId, apiKey } = options;
  const userId = options.userId || getAnonymousUserId();

  const results: ImageResult[] = [];
  let consecutiveRateLimits = 0; // 連続レート制限カウント

  for (let i = 0; i < prompts.length; i++) {
    // キャンセルチェック
    if (jobId && isJobCancelled(jobId)) {
      throw new JobCancelledError(jobId);
    }

    const prompt = prompts[i];

    // 進捗通知
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: prompts.length,
        currentStep: `画像生成中: ${prompt.title}`,
        images: results,
      });
    }

    // リトライ付きで生成（指数バックオフ対応）
    let lastError: string | undefined;
    let success = false;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      // リトライ前にもキャンセルチェック
      if (jobId && isJobCancelled(jobId)) {
        throw new JobCancelledError(jobId);
      }

      const result = await generateImage(prompt.prompt, apiKey);

      if (result.success && result.imageData && result.mimeType) {
        try {
          // S3に保存
          const extension = result.mimeType.includes('png') ? 'png' : 'jpg';
          const s3Key = generateS3Key(userId, jobId || 'unknown', prompt.id, extension);

          await uploadImageToS3(s3Key, result.imageData, result.mimeType);

          // DynamoDBにメタデータ保存
          await saveImageMetadata({
            userId,
            jobId: jobId || 'unknown',
            imageId: prompt.id,
            s3Key,
            title: prompt.title,
            size: result.imageData.length,
            mimeType: result.mimeType,
            createdAt: new Date().toISOString(),
          });

          results.push({
            id: prompt.id,
            index: i,
            title: prompt.title,
            filepath: s3Key, // S3キーをfilepathとして使用
            mimeType: result.mimeType,
            size: result.imageData.length,
            generatedAt: new Date().toISOString(),
          });

          success = true;
          consecutiveRateLimits = 0; // 成功したらリセット
          break;
        } catch (uploadError) {
          console.error(`Failed to upload image to S3: ${uploadError}`);
          lastError = uploadError instanceof Error ? uploadError.message : 'S3 upload failed';
          // リトライ
          if (attempt < retryCount) {
            await delay(delayBetweenRequests);
          }
          continue;
        }
      }

      lastError = result.error;

      // レート制限エラーの場合は指数バックオフ
      if (result.isRateLimited) {
        consecutiveRateLimits++;
        const backoffDelay = result.retryAfterMs ||
          calculateBackoffDelay(attempt, 10000, 120000);

        console.log(`Rate limited. Waiting ${Math.round(backoffDelay / 1000)}s before retry ${attempt + 1}/${retryCount}`);

        // 進捗通知（リトライ中）
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: prompts.length,
            currentStep: `レート制限中... ${Math.round(backoffDelay / 1000)}秒待機 (リトライ ${attempt + 1}/${retryCount})`,
            images: results,
          });
        }

        if (attempt < retryCount) {
          await delay(backoffDelay);
        }
      } else {
        // レート制限以外のエラーは通常のリトライ
        if (attempt < retryCount) {
          await delay(delayBetweenRequests);
        }
      }
    }

    // 全リトライ失敗
    if (!success) {
      console.error(`Failed to generate image for ${prompt.id}: ${lastError}`);
    }

    // 次のリクエストまで待機（連続レート制限が多い場合は長めに）
    if (i < prompts.length - 1) {
      const baseDelay = delayBetweenRequests;
      // 連続レート制限が発生している場合は待機時間を指数的に増加
      const additionalDelay = consecutiveRateLimits > 0
        ? Math.min(consecutiveRateLimits * 10000, 60000)  // 最大60秒追加
        : 0;
      const totalDelay = baseDelay + additionalDelay;

      // 進捗通知（待機中）
      if (onProgress && totalDelay > 5000) {
        onProgress({
          current: i + 1,
          total: prompts.length,
          currentStep: `次の画像まで ${Math.round(totalDelay / 1000)}秒待機中...`,
          images: results,
        });
      }

      await delay(totalDelay);
    }
  }

  return results;
}

/**
 * 単一のプロンプトから画像を生成してBufferを返す
 */
export async function generateSingleImage(
  prompt: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const result = await generateImage(prompt);

  if (result.success && result.imageData && result.mimeType) {
    return {
      buffer: result.imageData,
      mimeType: result.mimeType,
    };
  }

  return null;
}

/**
 * 指定ミリ秒待機
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
