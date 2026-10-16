// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'documents';

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo.' }, { status: 400 });
    }

    // 25 MB limit
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo supera el tamaño máximo permitido de 25 MB.' }, { status: 400 });
    }

    const supabaseAdmin = createServiceRoleClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'dat';
    const cleanFileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const filePath = `${folder}/${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('pawcare_media')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('[UploadAPI] Error uploading to Supabase storage:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: pubData } = supabaseAdmin.storage
      .from('pawcare_media')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      publicUrl: pubData.publicUrl,
      fileName: file.name,
      filePath,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno al procesar el archivo.';
    console.error('[UploadAPI] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
