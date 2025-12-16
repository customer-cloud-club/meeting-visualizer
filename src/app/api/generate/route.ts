import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { setJob, updateJob } from '@/lib/job-store';
import { analyzeText } from '@/engines/text-analyzer';
import { generateYAMLPrompts } from '@/engines/yaml-generator';
import { generateImages } from '@/engines/image-generator';
import type { Job, CreateJobRequest } from '@/types/job';
import type { AnalysisOptions } from '@/types/analysis';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body: CreateJobRequest = await request.json();

    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'テキストを入力してください' },
        { status: 400 }
      );
    }

    if (body.text.length > 200000) {
      return NextResponse.json(
        { error: 'テキストは200,000文字以内にしてください' },
        { status: 400 }
      );
    }

    const jobId = uuidv4();
    const now = new Date().toISOString();

    const job: Job = {
      id: jobId,
      status: 'queued',
      progress: {
        current: 0,
        total: 0,
        currentStep: '開始準備中...',
      },
      images: [],
      createdAt: now,
      updatedAt: now,
    };

    setJob(job);

    // 非同期でジョブを処理
    processJob(jobId, body.text, body.options);

    return NextResponse.json({
      jobId,
      status: 'queued',
      estimatedTime: 60,
    });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

async function processJob(
  jobId: string,
  text: string,
  options?: { maxSlides?: number; style?: string }
) {
  try {
    // Step 1: テキスト分析
    updateJob(jobId, {
      status: 'analyzing',
      progress: {
        current: 1,
        total: 3,
        currentStep: 'テキストを分析中...',
      },
    });

    const analysisOptions: AnalysisOptions = {
      maxSlides: options?.maxSlides ?? 8,
      style: (options?.style as 'default' | 'minimal' | 'detailed') ?? 'default',
    };

    const analysis = await analyzeText(text, analysisOptions);

    // Step 2: YAMLプロンプト生成
    updateJob(jobId, {
      status: 'generating_yaml',
      progress: {
        current: 2,
        total: 3,
        currentStep: 'プロンプトを生成中...',
      },
    });

    const yamlPrompts = generateYAMLPrompts(analysis);

    // Step 3: 画像生成
    updateJob(jobId, {
      status: 'generating_images',
      progress: {
        current: 0,
        total: yamlPrompts.length,
        currentStep: '画像を生成中...',
      },
    });

    // 出力ディレクトリを作成
    const outputDir = path.join(process.cwd(), 'public', 'generated', jobId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const images = await generateImages(yamlPrompts, { outputDir }, (progress) => {
      updateJob(jobId, {
        progress: {
          current: progress.current,
          total: progress.total,
          currentStep: progress.currentStep,
        },
        images: progress.images.map((img) => ({
          ...img,
          filepath: `/generated/${jobId}/${path.basename(img.filepath)}`,
        })),
      });
    });

    // 完了
    updateJob(jobId, {
      status: 'completed',
      progress: {
        current: yamlPrompts.length,
        total: yamlPrompts.length,
        currentStep: '完了',
      },
      images: images.map((img) => ({
        ...img,
        filepath: `/generated/${jobId}/${path.basename(img.filepath)}`,
      })),
    });
  } catch (error) {
    console.error('Job processing error:', error);
    updateJob(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
    });
  }
}
