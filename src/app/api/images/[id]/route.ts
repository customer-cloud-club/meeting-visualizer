import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // generated ディレクトリから画像を検索
  const generatedDir = path.join(process.cwd(), 'public', 'generated');

  if (!fs.existsSync(generatedDir)) {
    return NextResponse.json(
      { error: '画像が見つかりません' },
      { status: 404 }
    );
  }

  // ジョブディレクトリを検索
  const jobDirs = fs.readdirSync(generatedDir);

  for (const jobDir of jobDirs) {
    const jobPath = path.join(generatedDir, jobDir);
    if (!fs.statSync(jobPath).isDirectory()) continue;

    const files = fs.readdirSync(jobPath);
    const imageFile = files.find((f) => f.startsWith(id));

    if (imageFile) {
      const imagePath = path.join(jobPath, imageFile);
      const imageBuffer = fs.readFileSync(imagePath);
      const mimeType = imageFile.endsWith('.png') ? 'image/png' : 'image/jpeg';

      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }
  }

  return NextResponse.json(
    { error: '画像が見つかりません' },
    { status: 404 }
  );
}
