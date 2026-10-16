// src/components/layout/top-header.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatInMontevideo } from '@/lib/date-utils';
import { MessageSquare, User, ChevronDown, RefreshCw, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { KiraRepository } from '@/lib/storage/repository';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { PetSwitcher } from '@/components/pet/pet-switcher';
import { AuthModal } from '@/components/auth/auth-modal';
import { CloudSyncService, SyncStatus } from '@/lib/supabase/sync-service';
import { SupabaseAuthService } from '@/lib/supabase/auth-service';
import { Pet } from '@/types/medication';

export function TopHeader() {
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [phone, setPhone] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(CloudSyncService.getStatus());
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      // Current date formatted in Spanish
      const dateFormatted = formatInMontevideo(new Date(), "EEEE, d 'de' MMMM");
      setCurrentDateStr(dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1));

      const settings = KiraRepository.getSettings();
      setPhone(settings.whatsapp_phone);
      setRemindersEnabled(settings.reminders_enabled);
      setActivePet(KiraRepository.getActivePet());
    });

    CloudSyncService.init().then(() => {
      setSyncStatus(CloudSyncService.getStatus());
    });

    const handleSynced = () => {
      setSyncStatus(CloudSyncService.getStatus());
      setActivePet(KiraRepository.getActivePet());
    };
    const handlePetChange = () => {
      setActivePet(KiraRepository.getActivePet());
    };

    window.addEventListener('pawcare_synced', handleSynced);
    window.addEventListener('pawcare_pet_changed', handlePetChange);

    return () => {
      window.removeEventListener('pawcare_synced', handleSynced);
      window.removeEventListener('pawcare_pet_changed', handlePetChange);
    };
  }, []);

  // Click outside to close user menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await CloudSyncService.syncFromCloud();
    setSyncStatus(CloudSyncService.getStatus());
    setIsSyncing(false);
  };

  const handleSignOut = async () => {
    await SupabaseAuthService.signOut();
    KiraRepository.clearAllData();
    setIsUserMenuOpen(false);
    router.push('/login');
  };

  return (
    <header className="bg-white/85 dark:bg-[#1A1C1B]/90 backdrop-blur-md border-b border-[#E5E1D6] dark:border-stone-800 sticky top-0 z-40 px-3.5 sm:px-6 py-2.5 sm:py-3.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Multi-Pet Switcher */}
          <PetSwitcher />

          <div>
            <p className="text-xs text-[#606763] dark:text-stone-400 capitalize hidden md:block">
              {currentDateStr || 'Hoy'} • Montevideo
            </p>
          </div>
        </div>

        {/* Status Indicators & Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Supabase Cloud Connection Status */}
          {syncStatus.isAuthenticated ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-2xs"
                title={`Conectado a Supabase (${syncStatus.userEmail})`}
                aria-expanded={isUserMenuOpen}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-[120px]">{syncStatus.userEmail?.split('@')[0]}</span>
                <ChevronDown className={`w-3 h-3 text-emerald-700 dark:text-emerald-400 transition-transform shrink-0 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-stone-900 border border-[#E5E1D6] dark:border-stone-800 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* User Profile Header */}
                  <div className="flex items-center gap-3 p-2.5 bg-[#FAF8F5] dark:bg-stone-800/60 rounded-xl border border-[#E5E1D6] dark:border-stone-700/60 mb-2">
                    <div className="w-9 h-9 rounded-full bg-[#3E5A4D] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {syncStatus.userEmail ? syncStatus.userEmail.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#222624] dark:text-stone-100 truncate">
                        {syncStatus.userEmail}
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Supabase conectado
                      </p>
                    </div>
                  </div>

                  {/* Active Pet info */}
                  <div className="px-2.5 py-1.5 text-[11px] flex items-center justify-between text-[#606763] dark:text-stone-400 border-b border-[#EFECE5] dark:border-stone-800 mb-1.5 pb-2">
                    <span>Mascota activa:</span>
                    <span className="font-semibold text-[#222624] dark:text-stone-200">
                      🐾 {activePet?.name || 'Kira'}
                    </span>
                  </div>

                  {/* Action items */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#222624] dark:text-stone-200 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 transition-colors text-left"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span className="flex-1 truncate">{isSyncing ? 'Sincronizando...' : 'Sincronizar datos ahora'}</span>
                    </button>

                    <Link
                      href="/ajustes"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#222624] dark:text-stone-200 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 transition-colors text-left"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400 shrink-0" />
                      <span className="flex-1 truncate">Ajustes y recordatorios</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#222624] dark:text-stone-200 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 transition-colors text-left"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400 shrink-0" />
                      <span className="flex-1 truncate">Detalles de la cuenta</span>
                    </button>

                    <div className="pt-1 mt-1 border-t border-[#EFECE5] dark:border-stone-800">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#3E5A4D] hover:bg-[#32493E] text-white shadow-xs transition-colors shrink-0"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Iniciar Sesión</span>
              <span className="sm:hidden">Entrar</span>
            </button>
          )}

          {/* Recordatorios badge on desktop */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF8F5] dark:bg-stone-800/60 border border-[#E5E1D6] dark:border-stone-700 text-xs">
            <MessageSquare className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-sage-400" />
            <span className="hidden md:inline text-[#606763] dark:text-stone-400">Recordatorios:</span>
            <span
              className={
                remindersEnabled
                  ? 'font-medium text-[#274033] dark:text-sage-300'
                  : 'font-medium text-[#C34A3E] dark:text-red-400'
              }
            >
              {remindersEnabled ? (phone ? 'Activos' : 'Sin tel') : 'Pausados'}
            </span>
          </div>

          <ThemeToggle />
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setSyncStatus(CloudSyncService.getStatus())}
      />
    </header>
  );
}
