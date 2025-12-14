import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/job-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getJob(id);

  if (!job) {
    return NextResponse.json(
      { error: 'ジョブが見つかりません' },
      { status: 404 }
    );
  }

  return NextResponse.json(job);
}
