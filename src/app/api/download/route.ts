import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, images } = body;

    console.log('Download API called:', { jobId, imageCount: images?.length });

    if (!jobId || !images || images.length === 0) {
      return NextResponse.json(
        { error: 'ジョブIDと画像情報が必要です' },
        { status: 400 }
      );
    }

    const generatedDir = path.join(process.cwd(), 'public', 'generated', jobId);
    console.log('Generated dir:', generatedDir);

    if (!fs.existsSync(generatedDir)) {
      console.log('Directory not found:', generatedDir);
      return NextResponse.json(
        { error: '画像が見つかりません' },
        { status: 404 }
      );
    }

    // ZIPファイルをPromiseで作成
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 6 }
      });

      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        console.log('Archive finalized, total chunks:', chunks.length);
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', (err: Error) => {
        console.error('Archive error:', err);
        reject(err);
      });

      // 画像をZIPに追加
      let addedCount = 0;
      for (const image of images) {
        const filename = path.basename(image.filepath);
        const filepath = path.join(generatedDir, filename);

        console.log('Checking file:', filepath);

        if (fs.existsSync(filepath)) {
          const safeTitle = (image.title || image.id)
            .replace(/[\/\\:*?"<>|]/g, '_')
            .substring(0, 50);
          const ext = path.extname(filename);
          archive.file(filepath, { name: `${safeTitle}${ext}` });
          addedCount++;
          console.log('Added to archive:', `${safeTitle}${ext}`);
        } else {
          console.log('File not found:', filepath);
        }
      }

      console.log('Total files added:', addedCount);

      if (addedCount === 0) {
        reject(new Error('追加できるファイルがありません'));
        return;
      }

      archive.finalize();
    });

    console.log('ZIP buffer size:', zipBuffer.length);

    // ZIPファイルを返す（BufferをUint8Arrayに変換）
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="meeting-visualizer-${jobId.substring(0, 8)}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json(
      { error: 'ZIPファイルの作成に失敗しました' },
      { status: 500 }
    );
  }
}
