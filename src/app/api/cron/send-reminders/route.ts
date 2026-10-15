// src/app/api/cron/send-reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { NotificationScheduler } from '@/lib/whatsapp/scheduler';

function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET || 'dev_cron_secret_for_kira_care';
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');

  if (authHeader && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  if (querySecret && querySecret === cronSecret) {
    return true;
  }
  // Allow localhost during dev
  const host = request.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'No autorizado. Secreto de cron inválido.' }, { status: 401 });
  }

  // 1. Enqueue upcoming doses
  const enqueuedCount = NotificationScheduler.enqueueUpcomingDoses();

  // 2. Dispatch pending jobs
  const dispatchResult = await NotificationScheduler.processPendingJobs();

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    enqueuedUpcomingCount: enqueuedCount,
    ...dispatchResult,
  });
}

export async function GET(request: NextRequest) {
  // Support GET for standard web cron monitors
  return POST(request);
}
