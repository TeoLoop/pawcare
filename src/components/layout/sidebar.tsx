// src/components/layout/sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, History, Activity, Settings, Heart, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KiraRepository } from '@/lib/storage/repository';
import { Pet } from '@/types/medication';
import { AuthModal } from '@/components/auth/auth-modal';
import { CloudSyncService, SyncStatus } from '@/lib/supabase/sync-service';

const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/medicacion', label: 'Medicación', icon: Pill },
  { href: '/historial', label: 'Historial', icon: History },
  { href: '/salud', label: 'Salud', icon: Activity },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [activePet, setActivePet] = useState<Pet>(KiraRepository.getActivePet());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(CloudSyncService.getStatus());

  useEffect(() => {
    CloudSyncService.init().then(() => {
      setSyncStatus(CloudSyncService.getStatus());
    });

    const handlePetChange = () => {
      setActivePet(KiraRepository.getActivePet());
    };
    const handleSynced = () => {
      setSyncStatus(CloudSyncService.getStatus());
      setActivePet(KiraRepository.getActivePet());
    };

    window.addEventListener('pawcare_pet_changed', handlePetChange);
    window.addEventListener('pawcare_synced', handleSynced);
    return () => {
      window.removeEventListener('pawcare_pet_changed', handlePetChange);
      window.removeEventListener('pawcare_synced', handleSynced);
    };
  }, []);

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#E5E1D6] p-5 shrink-0 min-h-screen justify-between">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#E9EFEA] flex items-center justify-center text-[#3E5A4D] shadow-xs">
            <Heart className="w-5 h-5 fill-[#3E5A4D]" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-[#222624]">PawCare</span>
            <p className="text-[11px] text-[#606763] font-medium leading-tight">Salud & Medicación</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-[#E9EFEA] text-[#274033] shadow-xs font-semibold'
                    : 'text-[#606763] hover:text-[#222624] hover:bg-[#FAF8F5]'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-[#3E5A4D]' : 'text-[#8E9490]'
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer: Pet Card Mini & User Session */}
      <div className="space-y-2 pt-2">
        <Link
          href="/ajustes"
          className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFECE5] hover:border-[#D3DFD7] transition-all block"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#3E5A4D] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {activePet.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-[#222624] truncate">{activePet.name}</p>
              <p className="text-[10px] text-[#606763] truncate">
                {activePet.species} {activePet.breed ? `• ${activePet.breed}` : ''}
              </p>
            </div>
          </div>
        </Link>

        {syncStatus.isAuthenticated ? (
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-left hover:bg-emerald-100 transition-colors"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <div className="truncate">
                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                  {syncStatus.userEmail?.split('@')[0]}
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Nube conectada</p>
              </div>
            </div>
            <LogOut className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <User className="w-3.5 h-3.5" />
            <span>Iniciar Sesión / Crear</span>
          </button>
        )}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setSyncStatus(CloudSyncService.getStatus())}
      />
    </aside>
  );
}
