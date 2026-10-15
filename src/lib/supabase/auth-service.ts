// src/lib/supabase/auth-service.ts
import { createClient, isLiveSupabaseConfigured } from './client';
import { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isConfigured: boolean;
  isLoading: boolean;
}

export class SupabaseAuthService {
  private static get supabase() {
    return createClient();
  }

  static async getSession(): Promise<Session | null> {
    if (!isLiveSupabaseConfigured()) return null;
    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (error) {
        console.error('[SupabaseAuth] getSession error:', error.message);
        return null;
      }
      return data.session;
    } catch {
      return null;
    }
  }

  static async getUser(): Promise<User | null> {
    if (!isLiveSupabaseConfigured()) return null;
    try {
      const { data } = await this.supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  }

  static async signUpWithEmail(
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ user: User | null; error: string | null }> {
    if (!isLiveSupabaseConfigured()) {
      return { user: null, error: 'Supabase no está configurado en las variables de entorno.' };
    }

    try {
      // Call server endpoint to create pre-confirmed user (bypasses Supabase SMTP rate limits)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });

      const json = await res.json();
      if (!res.ok) {
        return { user: null, error: json.error || 'Error al crear la cuenta.' };
      }

      // Immediately sign in with the new confirmed credentials
      const signInRes = await this.signInWithEmail(email, password);
      return signInRes;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar usuario.';
      return { user: null, error: msg };
    }
  }

  static async signInWithEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    if (!isLiveSupabaseConfigured()) {
      return { user: null, error: 'Supabase no está configurado en las variables de entorno.' };
    }
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }
    return { user: data.user, error: null };
  }

  static async signInWithOtp(email: string): Promise<{ error: string | null }> {
    if (!isLiveSupabaseConfigured()) {
      return { error: 'Supabase no está configurado en las variables de entorno.' };
    }
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });
    return { error: error ? error.message : null };
  }

  static async signOut(): Promise<void> {
    if (!isLiveSupabaseConfigured()) return;
    await this.supabase.auth.signOut();
  }
}
