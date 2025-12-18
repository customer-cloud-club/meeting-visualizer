/**
 * 画像生成エンジン
 * YAMLプロンプトからNano Banana Proで画像を生成
 */

import fs from 'fs';
import path from 'path';
import { generateImage, generateImagesSequentially } from '../services/gemini-client';
import { isJobCancelled } from '../lib/job-store';
import type { YAMLPrompt } from './yaml-generator';
import type { ImageResult, GenerationOptions, GenerationProgress } from '../types/image';

export class JobCancelledError extends Error {
  constructor(jobId: string) {
    super(`Job ${jobId} was cancelled`);
    this.name = 'JobCancelledError';
  }
}

/**
 * 複数のYAMLプロンプトから画像を生成
 */
export async function generateImages(
  prompts: YAMLPrompt[],
  options: GenerationOptions & { jobId?: string },
  onProgress?: (progress: GenerationProgress) => void
): Promise<ImageResult[]> {
  const { outputDir, delayBetweenRequests = 3000, retryCount = 2, jobId, apiKey } = options;

  // 出力ディレクトリ作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results: ImageResult[] = [];

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

    // リトライ付きで生成
    let lastError: string | undefined;
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      // リトライ前にもキャンセルチェック
      if (jobId && isJobCancelled(jobId)) {
        throw new JobCancelledError(jobId);
      }

      const result = await generateImage(prompt.prompt, apiKey);

      if (result.success && result.imageData && result.mimeType) {
        // ファイル保存
        const extension = result.mimeType.includes('png') ? 'png' : 'jpg';
        const filename = `${prompt.id}.${extension}`;
        const filepath = path.join(outputDir, filename);

        fs.writeFileSync(filepath, result.imageData);

        results.push({
          id: prompt.id,
          index: i,
          title: prompt.title,
          filepath,
          mimeType: result.mimeType,
          size: result.imageData.length,
          generatedAt: new Date().toISOString(),
        });

        break;
      }

      lastError = result.error;

      // リトライ前に待機
      if (attempt < retryCount) {
        await delay(delayBetweenRequests);
      }
    }

    // 全リトライ失敗
    if (results.length <= i) {
      console.error(`Failed to generate image for ${prompt.id}: ${lastError}`);
    }

    // 次のリクエストまで待機
    if (i < prompts.length - 1) {
      await delay(delayBetweenRequests);
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

/**
 * 出力ディレクトリのクリーンアップ
 */
export function cleanupOutputDir(outputDir: string): void {
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir);
    for (const file of files) {
      fs.unlinkSync(path.join(outputDir, file));
    }
  }
}
