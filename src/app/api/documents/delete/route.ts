// src/app/api/documents/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, file_url } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de documento requerido' }, { status: 400 });
    }

    const supabaseAdmin = createServiceRoleClient();

    // 1. Delete record from medical_documents table
    const { error: dbError } = await supabaseAdmin
      .from('medical_documents')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('[DocumentDeleteAPI] Error deleting row from database:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // 2. If file_url points to pawcare_media storage, remove file from bucket
    if (file_url && typeof file_url === 'string' && file_url.includes('pawcare_media')) {
      try {
        const parts = file_url.split('/pawcare_media/');
        if (parts[1]) {
          const storagePath = decodeURIComponent(parts[1]);
          await supabaseAdmin.storage.from('pawcare_media').remove([storagePath]);
        }
      } catch (storageErr) {
        console.warn('[DocumentDeleteAPI] Warning cleaning up storage object:', storageErr);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar el documento.';
    console.error('[DocumentDeleteAPI] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
