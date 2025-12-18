import { NextRequest, NextResponse } from 'next/server';
import { cancelJob, getJob } from '@/lib/job-store';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }

  // Already completed or failed
  if (job.status === 'completed' || job.status === 'failed') {
    return NextResponse.json(
      { error: 'Job already finished', status: job.status },
      { status: 400 }
    );
  }

  const cancelled = cancelJob(jobId);
  if (!cancelled) {
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    jobId,
    message: 'Job cancelled',
  });
}
