// src/app/api/weight/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { WeightLog } from '@/types/health';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');

    if (!petId) {
      return NextResponse.json({ error: 'petId requerido' }, { status: 400 });
    }

    const supabaseAdmin = createServiceRoleClient();
    const filePath = `data/weight_logs_${petId}.json`;

    const { data, error } = await supabaseAdmin.storage
      .from('pawcare_media')
      .download(filePath);

    if (error || !data) {
      return NextResponse.json({ logs: [] });
    }

    const text = await data.text();
    const logs = JSON.parse(text) as WeightLog[];
    return NextResponse.json({ logs });
  } catch (err: unknown) {
    console.error('[WeightAPI] GET error:', err);
    return NextResponse.json({ logs: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { petId, logs, latestWeight } = body as {
      petId: string;
      logs: WeightLog[];
      latestWeight?: number;
    };

    if (!petId || !logs) {
      return NextResponse.json({ error: 'petId y logs requeridos' }, { status: 400 });
    }

    const supabaseAdmin = createServiceRoleClient();
    const filePath = `data/weight_logs_${petId}.json`;
    const buffer = Buffer.from(JSON.stringify(logs, null, 2));

    // 1. Upload logs JSON to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('pawcare_media')
      .upload(filePath, buffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.error('[WeightAPI] Error uploading weight logs:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 2. Also update current weight_kg in pets table
    if (latestWeight !== undefined && latestWeight !== null) {
      await supabaseAdmin
        .from('pets')
        .update({
          weight_kg: latestWeight,
          updated_at: new Date().toISOString(),
        })
        .eq('id', petId);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar registros de peso.';
    console.error('[WeightAPI] POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
