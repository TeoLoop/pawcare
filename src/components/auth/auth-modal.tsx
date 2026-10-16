// src/components/auth/auth-modal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { SupabaseAuthService } from '@/lib/supabase/auth-service';
import { CloudSyncService, SyncStatus } from '@/lib/supabase/sync-service';
import { isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { KiraRepository } from '@/lib/storage/repository';
import { Cloud, CheckCircle2, AlertCircle, RefreshCw, LogOut, Mail, Lock, User as UserIcon, ShieldCheck, Settings } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTab?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, onSuccess, initialTab = 'signin' }: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);
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
    setTab(initialTab);

    const handleSynced = () => {
      setSyncStatus(CloudSyncService.getStatus());
    };
    window.addEventListener('pawcare_synced', handleSynced);
    return () => window.removeEventListener('pawcare_synced', handleSynced);
  }, [isOpen, initialTab]);

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
      setSyncStatus(CloudSyncService.getStatus());
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1200);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await SupabaseAuthService.signOut();
    KiraRepository.clearAllData();
    setSyncStatus(CloudSyncService.getStatus());
    setLoading(false);
    onClose();
    window.location.href = '/login';
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={syncStatus.isAuthenticated ? "Mi Cuenta de PawCare" : (tab === 'signin' ? "Iniciar Sesión" : "Crear mi Cuenta")}
      description={syncStatus.isAuthenticated ? "Gestión de sesión y sincronización con Supabase" : "Conectá tu cuenta para sincronizar tus mascotas y dosis en la nube."}
      maxWidth={syncStatus.isAuthenticated ? "max-w-md" : "max-w-lg"}
    >
      <div className="space-y-4 pt-1">
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

        {/* If user is already authenticated */}
        {syncStatus.isAuthenticated ? (
          <div className="space-y-4">
            {/* User Profile Card */}
            <div className="p-4 bg-[#FAF8F5] dark:bg-stone-800/60 rounded-2xl border border-[#E5E1D6] dark:border-stone-700 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-[#3E5A4D] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                {syncStatus.userEmail ? syncStatus.userEmail.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#222624] dark:text-stone-100 truncate">
                    {syncStatus.userEmail}
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <ShieldCheck className="w-3 h-3" /> Verificado
                  </span>
                </div>
                <p className="text-xs text-[#606763] dark:text-stone-400 mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Supabase PostgreSQL en línea
                </p>
              </div>
            </div>

            {/* Quick Details Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-[#E5E1D6] dark:border-stone-700/60">
                <span className="text-[10px] font-bold text-[#606763] dark:text-stone-400 uppercase tracking-wider block">
                  Mascota Activa
                </span>
                <span className="text-xs font-bold text-[#222624] dark:text-stone-100 mt-1 block truncate">
                  🐾 {KiraRepository.getActivePet()?.name || 'Kira'}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-[#E5E1D6] dark:border-stone-700/60">
                <span className="text-[10px] font-bold text-[#606763] dark:text-stone-400 uppercase tracking-wider block">
                  Última Sincro
                </span>
                <span className="text-xs font-bold text-[#222624] dark:text-stone-100 mt-1 block truncate">
                  {syncStatus.lastSyncedAt
                    ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
                    : 'Al día'}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FAF8F5] dark:bg-stone-800 hover:bg-[#EFECE5] dark:hover:bg-stone-700 border border-[#E5E1D6] dark:border-stone-700 text-[#222624] dark:text-stone-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Sincronizando...' : 'Sincronizar datos ahora'}
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.location.href = '/ajustes';
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-stone-900 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 text-[#3E5A4D] dark:text-emerald-400 rounded-xl text-xs font-bold transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Configuración y recordatorios
              </button>

              <div className="pt-2 border-t border-[#EFECE5] dark:border-stone-800">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Connection status header */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isConfigured
                ? 'bg-[#FAF8F5] dark:bg-stone-800 border-[#E5E1D6] dark:border-stone-700 text-[#606763] dark:text-stone-300'
                : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600'
            }`}>
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 shrink-0 text-stone-500" />
                <span className="font-semibold">
                  {isConfigured
                    ? 'Base de datos Supabase lista para conectar'
                    : 'Conectando con Supabase...'}
                </span>
              </div>
            </div>
          /* Authentication Forms */
          <div className="space-y-4">
            {/* Segmented Switch */}
            <div className="grid grid-cols-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
              <button
                type="button"
                onClick={() => { setTab('signin'); setErrorMsg(null); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
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
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  tab === 'signup'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                Crear Cuenta
              </button>
            </div>

            {tab === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4 pt-1">
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
                  className="w-full py-3 bg-[#3E5A4D] hover:bg-[#32493E] text-white rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 mt-1"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setTab('signup'); setErrorMsg(null); }}
                    className="text-xs text-[#3E5A4D] dark:text-emerald-400 font-semibold hover:underline"
                  >
                    ¿No tenés cuenta? Creá tu cuenta gratis aquí →
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Tu nombre o nombre del tutor
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
                  className="w-full py-3 bg-[#3E5A4D] hover:bg-[#32493E] text-white rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 mt-1"
                >
                  {loading ? 'Creando cuenta...' : 'Crear mi Cuenta'}
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
        </>
      )}
    </div>
    </Modal>
  );
}
