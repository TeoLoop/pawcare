// src/app/login/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SupabaseAuthService } from '@/lib/supabase/auth-service';
import { CloudSyncService } from '@/lib/supabase/sync-service';
import { isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { Mail, Lock, User as UserIcon, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { PawIcon } from '@/components/ui/paw-icon';

function translateError(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return 'Correo electrónico o contraseña incorrectos.';
  }
  if (lower.includes('already registered') || lower.includes('already existed') || lower.includes('user already exists')) {
    return 'Este correo ya está registrado. Podés ingresar tu contraseña en "Iniciar Sesión".';
  }
  if (lower.includes('at least 6 characters') || lower.includes('password should be at least')) {
    return 'La contraseña debe tener un mínimo de 6 caracteres.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Correo electrónico pendiente de confirmación.';
  }
  return error;
}

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // If already logged in, redirect straight to dashboard
    if (isLiveSupabaseConfigured()) {
      SupabaseAuthService.getUser().then((user) => {
        if (user) {
          router.replace('/');
        }
      });
    }
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await SupabaseAuthService.signInWithEmail(email.trim(), password);

    if (res.error) {
      setLoading(false);
      setErrorMsg(translateError(res.error));
    } else {
      setSuccessMsg('¡Sesión iniciada con éxito! Conectando con tu base de datos...');
      try {
        await CloudSyncService.syncFromCloud();
      } catch (err) {
        console.warn('Sync warning:', err);
      }
      setLoading(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pawcare_synced'));
      }
      router.replace('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await SupabaseAuthService.signUpWithEmail(email.trim(), password, fullName.trim());

    if (res.error) {
      setLoading(false);
      setErrorMsg(translateError(res.error));
    } else {
      setSuccessMsg('¡Cuenta creada con éxito! Conectando con tu base de datos...');
      try {
        await CloudSyncService.syncFromCloud();
      } catch (err) {
        console.warn('Sync warning:', err);
      }
      setLoading(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pawcare_synced'));
      }
      router.replace('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-stone-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#E9EFEA] dark:bg-emerald-950/50 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
            <PawIcon className="w-7 h-7 fill-current" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#222624] dark:text-stone-100">
              PawCare
            </h1>
            <p className="text-xs text-[#606763] dark:text-stone-400 mt-1">
              Salud, medicación y recordatorios por WhatsApp de tus mascotas
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-8 shadow-sm space-y-6">
          {/* Tabs */}
          <div className="grid grid-cols-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl">
            <button
              type="button"
              onClick={() => { setTab('signin'); setErrorMsg(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'signin'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setErrorMsg(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'signup'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {/* Error & Success Alerts */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Forms */}
          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#3E5A4D] hover:bg-[#32493E] text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {loading ? 'Iniciando sesión...' : 'Entrar a mi cuenta'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setTab('signup'); setErrorMsg(null); }}
                  className="text-xs text-[#3E5A4D] dark:text-emerald-400 font-semibold hover:underline"
                >
                  ¿No tenés cuenta todavía? Creá tu cuenta gratis →
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Tu nombre o apodo de tutor
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Mateo"
                    autoComplete="name"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#3E5A4D] hover:bg-[#32493E] text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setTab('signin'); setErrorMsg(null); }}
                  className="text-xs text-[#3E5A4D] dark:text-emerald-400 font-semibold hover:underline"
                >
                  ¿Ya tenés una cuenta? Iniciá sesión aquí →
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
