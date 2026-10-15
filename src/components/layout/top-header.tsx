// src/components/layout/top-header.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { formatInMontevideo } from '@/lib/date-utils';
import { MessageSquare, Cloud } from 'lucide-react';
import { KiraRepository } from '@/lib/storage/repository';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { PetSwitcher } from '@/components/pet/pet-switcher';
import { AuthModal } from '@/components/auth/auth-modal';
import { CloudSyncService, SyncStatus } from '@/lib/supabase/sync-service';

export function TopHeader() {
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [phone, setPhone] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(CloudSyncService.getStatus());

  useEffect(() => {
    // Current date formatted in Spanish
    const dateFormatted = formatInMontevideo(new Date(), "EEEE, d 'de' MMMM");
    // Capitalize first letter
    setCurrentDateStr(dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1));

    const settings = KiraRepository.getSettings();
    setPhone(settings.whatsapp_phone);
    setRemindersEnabled(settings.reminders_enabled);

    CloudSyncService.init().then(() => {
      setSyncStatus(CloudSyncService.getStatus());
    });

    const handleSynced = () => {
      setSyncStatus(CloudSyncService.getStatus());
    };
    window.addEventListener('pawcare_synced', handleSynced);
    return () => window.removeEventListener('pawcare_synced', handleSynced);
  }, []);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-[#E5E1D6] sticky top-0 z-40 px-4 sm:px-6 py-3.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Multi-Pet Switcher */}
          <PetSwitcher />

          <div>
            <p className="text-xs text-[#606763] capitalize hidden sm:block">
              {currentDateStr || 'Hoy'} • Montevideo
            </p>
          </div>
        </div>

        {/* Status Indicators & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Supabase Cloud Connection Status */}
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
              syncStatus.isConfigured && syncStatus.isAuthenticated
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                : syncStatus.isConfigured
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200'
            }`}
            title={
              syncStatus.isConfigured && syncStatus.isAuthenticated
                ? `Conectado a Supabase (${syncStatus.userEmail})`
                : syncStatus.isConfigured
                ? 'Supabase configurado: hacer clic para iniciar sesión'
                : 'Modo local: hacer clic para conectar Supabase'
            }
          >
            <Cloud className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {syncStatus.isConfigured
                ? syncStatus.isAuthenticated
                  ? 'Supabase Conectado'
                  : 'Entrar a Supabase'
                : 'Nube'}
            </span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF8F5] dark:bg-stone-800/60 border border-[#E5E1D6] dark:border-stone-700 text-xs">
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
