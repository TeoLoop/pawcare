// src/components/auth/auth-modal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { SupabaseAuthService } from '@/lib/supabase/auth-service';
import { CloudSyncService, SyncStatus } from '@/lib/supabase/sync-service';
import { isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { Cloud, CheckCircle2, AlertCircle, RefreshCw, UploadCloud, LogOut, Mail, Lock, User as UserIcon } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(CloudSyncService.getStatus());
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    setIsConfigured(isLiveSupabaseConfigured());
    setSyncStatus(CloudSyncService.getStatus());

    const handleSynced = () => {
      setSyncStatus(CloudSyncService.getStatus());
    };
    window.addEventListener('pawcare_synced', handleSynced);
    return () => window.removeEventListener('pawcare_synced', handleSynced);
  }, [isOpen]);

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
      setSuccessMsg('¡Sesión iniciada con éxito! Sincronizando datos...');
      await CloudSyncService.syncFromCloud();
      setSyncStatus(CloudSyncService.getStatus());
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1500);
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
      setSuccessMsg('¡Cuenta creada con éxito! Si tu proyecto tiene confirmación de email activa, revisá tu casilla de correo.');
      await CloudSyncService.syncFromCloud();
      setSyncStatus(CloudSyncService.getStatus());
      if (onSuccess) onSuccess();
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await SupabaseAuthService.signInWithOtp(email);
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Enlace de acceso enviado. Por favor revisá tu bandeja de entrada.');
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await SupabaseAuthService.signOut();
    setSyncStatus(CloudSyncService.getStatus());
    setLoading(false);
    setSuccessMsg('Sesión cerrada correctamente.');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pawcare_synced'));
    }
  };

  const handleManualSync = async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await CloudSyncService.syncFromCloud();
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Error al sincronizar.');
    } else {
      setSuccessMsg('Datos sincronizados correctamente con Supabase.');
    }
  };

  const handleUploadLocal = async () => {
    if (!confirm('¿Deseás subir todos los datos locales actuales a tu base de datos de Supabase?')) {
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    const res = await CloudSyncService.uploadLocalDataToCloud();
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Error al subir los datos.');
    } else {
      setSuccessMsg(`Se migraron ${res.count} registros a tu base de datos en Supabase.`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nube y Autenticación Supabase"
      description="Gestioná la conexión persistente con tu base de datos PostgreSQL en Supabase."
    >
      <div className="space-y-6 pt-2">
        {/* Status Banner */}
        <div className={`p-4 rounded-xl border ${
          isConfigured
            ? syncStatus.isAuthenticated
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
            : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800'
        }`}>
          <div className="flex items-start gap-3">
            <Cloud className={`w-5 h-5 mt-0.5 ${
              isConfigured && syncStatus.isAuthenticated
                ? 'text-emerald-600 dark:text-emerald-400'
                : isConfigured
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-stone-400'
            }`} />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {isConfigured
                  ? syncStatus.isAuthenticated
                    ? 'Conectado a la nube de Supabase'
                    : 'Supabase configurado (Esperando inicio de sesión)'
                  : 'Supabase en modo simulado / local'}
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                {isConfigured
                  ? syncStatus.isAuthenticated
                    ? `Sesión activa como: ${syncStatus.userEmail}`
                    : 'Las variables de entorno están listas. Iniciá sesión para sincronizar automáticamente.'
                  : 'Para persistencia real en la nube, agregá NEXT_PUBLIC_SUPABASE_URL y tu ANON_KEY en .env.local.'}
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* If user is already authenticated */}
        {syncStatus.isAuthenticated ? (
          <div className="space-y-4">
            <div className="bg-stone-50 dark:bg-stone-900/60 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Usuario activo</div>
                  <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
                    {syncStatus.userEmail}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar sesión
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-sm font-medium transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Sincronizar ahora
              </button>
              <button
                type="button"
                onClick={handleUploadLocal}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <UploadCloud className="w-4 h-4" />
                Subir datos locales
              </button>
            </div>
          </div>
        ) : (
          /* Authentication Forms */
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => { setTab('signin'); setErrorMsg(null); }}
                className={`flex-1 pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'signin'
                    ? 'border-sage-600 text-sage-700 dark:text-sage-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => { setTab('signup'); setErrorMsg(null); }}
                className={`flex-1 pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'signup'
                    ? 'border-sage-600 text-sage-700 dark:text-sage-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                Crear cuenta
              </button>
              <button
                type="button"
                onClick={() => { setTab('magic'); setErrorMsg(null); }}
                className={`flex-1 pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'magic'
                    ? 'border-sage-600 text-sage-700 dark:text-sage-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                Magic Link
              </button>
            </div>

            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Iniciando sesión...' : 'Entrar con Supabase'}
                </button>
              </form>
            )}

            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Tu nombre o nombre del tutor
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Mateo"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Contraseña (mínimo 6 caracteres)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Creando cuenta...' : 'Crear cuenta y activar RLS'}
                </button>
              </form>
            )}

            {tab === 'magic' && (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"
                    />
                  </div>
                </div>

                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Te enviaremos un correo con un enlace seguro para iniciar sesión automáticamente sin necesidad de recordar una contraseña.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace Magic Link'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
