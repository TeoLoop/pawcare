// src/app/api/pets/share/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');

    if (!petId) {
      return NextResponse.json({ error: 'petId requerido' }, { status: 400 });
    }

    const supabaseAdmin = createServiceRoleClient();

    // 1. Get pet and owner info
    const { data: pet, error: petError } = await supabaseAdmin
      .from('pets')
      .select('id, name, owner_id')
      .eq('id', petId)
      .single();

    if (petError || !pet) {
      return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 });
    }

    const { data: ownerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', pet.owner_id)
      .maybeSingle();

    // 2. Get guardians list
    const { data: guardians, error: guardiansError } = await supabaseAdmin
      .from('pet_guardians')
      .select('id, user_id, role, created_at')
      .eq('pet_id', petId);

    if (guardiansError) {
      return NextResponse.json({ error: guardiansError.message }, { status: 500 });
    }

    // Attach profile info to each guardian
    const guardiansWithProfiles = await Promise.all(
      (guardians || []).map(async (g) => {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('email, full_name')
          .eq('id', g.user_id)
          .maybeSingle();

        return {
          id: g.id,
          user_id: g.user_id,
          role: g.role,
          created_at: g.created_at,
          email: prof?.email || 'Sin correo',
          name: prof?.full_name || 'Co-tutor',
        };
      })
    );

    return NextResponse.json({
      pet: { id: pet.id, name: pet.name },
      owner: {
        id: pet.owner_id,
        email: ownerProfile?.email || 'Propietario',
        name: ownerProfile?.full_name || 'Tutor principal',
      },
      guardians: guardiansWithProfiles,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al obtener co-tutores';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { petId, identifier } = body as { petId?: string; identifier?: string };

    if (!petId || !identifier?.trim()) {
      return NextResponse.json(
        { error: 'petId y usuario o correo del co-tutor son requeridos.' },
        { status: 400 }
      );
    }

    const trimmed = identifier.trim();
    const supabaseAdmin = createServiceRoleClient();

    // 1. Verify pet exists
    const { data: pet, error: petError } = await supabaseAdmin
      .from('pets')
      .select('id, name, owner_id')
      .eq('id', petId)
      .single();

    if (petError || !pet) {
      return NextResponse.json({ error: 'Mascota no encontrada.' }, { status: 404 });
    }

    // 2. Resolve target user by email or username in profiles
    let targetUser: { id: string; email: string; full_name: string | null } | null = null;

    if (trimmed.includes('@')) {
      const { data: byEmail } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', trimmed)
        .maybeSingle();

      if (byEmail) targetUser = byEmail;
    } else {
      const { data: byName } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .ilike('full_name', trimmed)
        .maybeSingle();

      if (byName) targetUser = byName;
    }

    // Fallback: check in auth.users by user_metadata
    if (!targetUser) {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      if (userList?.users) {
        const found = userList.users.find((u) => {
          const uEmail = (u.email || '').toLowerCase();
          const uName = (u.user_metadata?.username || '').toLowerCase();
          const fName = (u.user_metadata?.full_name || '').toLowerCase();
          const target = trimmed.toLowerCase();
          return uEmail === target || uName === target || fName === target;
        });

        if (found) {
          targetUser = {
            id: found.id,
            email: found.email || trimmed,
            full_name: found.user_metadata?.username || found.user_metadata?.full_name || 'Co-tutor',
          };
        }
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        {
          error: `No encontramos ningún usuario con "${trimmed}". Pedile a tu novia o familiar que cree su cuenta en PawCare primero.`,
        },
        { status: 404 }
      );
    }

    // 3. Cannot share with owner
    if (targetUser.id === pet.owner_id) {
      return NextResponse.json(
        { error: 'Este usuario ya es el propietario principal de la mascota.' },
        { status: 400 }
      );
    }

    // 4. Check if already a guardian
    const { data: existing } = await supabaseAdmin
      .from('pet_guardians')
      .select('id')
      .eq('pet_id', petId)
      .eq('user_id', targetUser.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `${targetUser.full_name || targetUser.email} ya tiene acceso a ${pet.name}.` },
        { status: 400 }
      );
    }

    // 5. Insert guardian record
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('pet_guardians')
      .insert({
        pet_id: petId,
        user_id: targetUser.id,
        role: 'co_owner',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `¡Mascota ${pet.name} compartida con éxito con ${targetUser.full_name || targetUser.email}!`,
      guardian: {
        id: inserted.id,
        user_id: targetUser.id,
        email: targetUser.email,
        name: targetUser.full_name || 'Co-tutor',
        role: 'co_owner',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al compartir mascota';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');
    const guardianId = searchParams.get('guardianId');
    const userId = searchParams.get('userId');

    if (!petId || (!guardianId && !userId)) {
      return NextResponse.json(
        { error: 'petId y guardianId o userId son requeridos.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createServiceRoleClient();

    let query = supabaseAdmin.from('pet_guardians').delete().eq('pet_id', petId);
    if (guardianId) {
      query = query.eq('id', guardianId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al remover co-tutor';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
