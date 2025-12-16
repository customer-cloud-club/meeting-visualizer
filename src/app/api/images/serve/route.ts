import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imagePath = searchParams.get('path');

  if (!imagePath) {
    return NextResponse.json(
      { error: 'パスが指定されていません' },
      { status: 400 }
    );
  }

  // パスを正規化（セキュリティ対策）
  const normalizedPath = path.normalize(imagePath).replace(/^\/+/, '');

  // generated ディレクトリのみ許可
  if (!normalizedPath.startsWith('generated/')) {
    return NextResponse.json(
      { error: '不正なパスです' },
      { status: 403 }
    );
  }

  const fullPath = path.join(process.cwd(), 'public', normalizedPath);

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json(
      { error: '画像が見つかりません' },
      { status: 404 }
    );
  }

  const imageBuffer = fs.readFileSync(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000',
      'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
    },
  });
}
