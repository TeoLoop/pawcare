// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Correo electrónico y contraseña requeridos.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createServiceRoleClient();

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (!listError && existingUsers?.users) {
      const found = existingUsers.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (found) {
        // User already exists. Make sure email is confirmed and update password so they can log in
        await supabaseAdmin.auth.admin.updateUserById(found.id, {
          email_confirm: true,
          password: password,
          user_metadata: { full_name: fullName || found.user_metadata?.full_name || 'Tutor' },
        });

        return NextResponse.json({
          success: true,
          alreadyExisted: true,
          message: 'Tu cuenta ya existía; se actualizó tu contraseña y confirmación. Ya podés entrar.',
        });
      }
    }

    // Create user with email_confirm = true so they don't have to wait or get rate limited
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || 'Tutor',
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al registrar usuario.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
