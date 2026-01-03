import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getImageFromS3 } from '@/lib/aws-clients';

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
  const normalizedPath = imagePath.replace(/^\/+/, '');

  // S3キーとして使用（形式: userId/jobId/imageId.ext）
  // パスインジェクション対策
  if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
    return NextResponse.json(
      { error: '不正なパスです' },
      { status: 403 }
    );
  }

  try {
    const result = await getImageFromS3(normalizedPath);

    if (!result) {
      return NextResponse.json(
        { error: '画像が見つかりません' },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': result.mimeType,
        'Cache-Control': 'public, max-age=31536000',
        'Content-Disposition': `inline; filename="${path.basename(normalizedPath)}"`,
      },
    });
  } catch (error) {
    console.error('S3 image fetch error:', error);
    return NextResponse.json(
      { error: '画像の取得に失敗しました' },
      { status: 500 }
    );
  }
}
