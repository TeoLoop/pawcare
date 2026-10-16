// src/app/api/auth/resolve-identifier/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier = (body.identifier || '').trim();

    if (!identifier) {
      return NextResponse.json({ error: 'Identificador requerido' }, { status: 400 });
    }

    // If already an email, return directly
    if (identifier.includes('@')) {
      return NextResponse.json({ email: identifier.toLowerCase() });
    }

    const supabaseAdmin = createServiceRoleClient();

    // 1. Check in profiles by full_name (case-insensitive)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .ilike('full_name', identifier)
      .maybeSingle();

    if (profile?.email) {
      return NextResponse.json({ email: profile.email.toLowerCase() });
    }

    // 2. Check in auth.users by user_metadata (username or full_name)
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    if (userList?.users) {
      const match = userList.users.find((u) => {
        const uName = (u.user_metadata?.username || '').toLowerCase();
        const fName = (u.user_metadata?.full_name || '').toLowerCase();
        const target = identifier.toLowerCase();
        return uName === target || fName === target;
      });

      if (match?.email) {
        return NextResponse.json({ email: match.email.toLowerCase() });
      }
    }

    // Fallback: return as-is
    return NextResponse.json({ email: identifier });
  } catch (err: unknown) {
    console.error('[ResolveIdentifier] Error:', err);
    return NextResponse.json({ email: '' }, { status: 500 });
  }
}
