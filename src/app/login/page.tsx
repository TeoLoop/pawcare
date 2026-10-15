// src/app/login/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SupabaseAuthService } from '@/lib/supabase/auth-service';
import { CloudSyncService } from '@/lib/supabase/sync-service';
import { isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { Heart, Mail, Lock, User as UserIcon, CheckCircle2, AlertCircle, ArrowLeft, Cloud } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    setIsConfigured(isLiveSupabaseConfigured());
    // If already logged in, redirect to home
    SupabaseAuthService.getUser().then((user) => {
      if (user) {
        router.push('/');
      }
    });
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await SupabaseAuthService.signInWithEmail(email, password);
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('¡Sesión iniciada con éxito! Sincronizando tus datos...');
      await CloudSyncService.syncFromCloud();
      setTimeout(() => {
        router.push('/');
      }, 1000);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await SupabaseAuthService.signUpWithEmail(email, password, fullName);
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('¡Cuenta creada y confirmada! Conectando con tu base de datos...');
      await CloudSyncService.syncFromCloud();
      setTimeout(() => {
        router.push('/');
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-stone-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Top Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a PawCare
        </Link>

        {/* Card */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-8 shadow-sm space-y-6">
          {/* Header Brand */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] dark:bg-emerald-950/50 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#222624] dark:text-stone-100">
              {tab === 'signin' ? 'Iniciar Sesión en PawCare' : 'Crear Cuenta en PawCare'}
            </h1>
            <p className="text-xs text-[#606763] dark:text-stone-400 max-w-xs mx-auto">
              Gestioná los tratamientos, síntomas y recordatorios de tus mascotas en la nube
            </p>
          </div>

          {/* Cloud Status Pill */}
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
            isConfigured
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
          }`}>
            <Cloud className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">
              {isConfigured
                ? 'Conectado a tu base de datos PostgreSQL en Supabase'
                : 'Modo local activo'}
            </span>
          </div>

          {/* Error & Success Alerts */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode Switcher Buttons */}
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
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
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
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#3E5A4D] hover:bg-[#32493E] text-white rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 mt-2"
              >
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
                  Nombre o apodo del tutor
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Mateo"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
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
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
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
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#3E5A4D] hover:bg-[#32493E] text-white rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 mt-2"
              >
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

          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 text-center">
            <Link
              href="/"
              className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 font-medium"
            >
              Continuar en modo explorador local sin iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
