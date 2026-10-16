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

    // 1. Try to fetch from PostgreSQL weight_logs table first
    try {
      const { data: dbLogs, error: dbError } = await supabaseAdmin
        .from('weight_logs')
        .select('*')
        .eq('pet_id', petId)
        .order('logged_date', { ascending: false });

      if (!dbError && dbLogs && dbLogs.length > 0) {
        return NextResponse.json({ logs: dbLogs as WeightLog[] });
      }
    } catch {
      // Fallback to storage below
    }

    // 2. Fallback to Supabase Cloud Storage
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
      console.warn('[WeightAPI] Warning uploading weight logs to storage:', uploadError);
    }

    // 2. Try inserting/updating PostgreSQL weight_logs table if exists
    try {
      if (logs.length > 0) {
        const rows = logs.map((l) => ({
          id: l.id,
          pet_id: petId,
          weight_kg: l.weight_kg,
          logged_date: l.logged_date,
          notes: l.notes || null,
          created_at: l.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        await supabaseAdmin.from('weight_logs').upsert(rows, { onConflict: 'id' });
      }
    } catch {
      // Table may not exist yet, storage backup succeeded
    }

    // 3. Also update current weight_kg in pets table
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
