// src/app/api/whatsapp/webhook/route.ts
// CallMeBot does not support incoming webhooks — this endpoint is kept minimal
// in case it's needed for future integrations.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', provider: 'callmebot' });
}

export async function POST() {
  return NextResponse.json({ status: 'ok' });
}
