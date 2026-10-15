// src/components/layout/sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, History, Activity, Settings, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KiraRepository } from '@/lib/storage/repository';
import { Pet } from '@/types/medication';

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

  useEffect(() => {
    const handlePetChange = () => {
      setActivePet(KiraRepository.getActivePet());
    };
    window.addEventListener('pawcare_pet_changed', handlePetChange);
    return () => window.removeEventListener('pawcare_pet_changed', handlePetChange);
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

      {/* Pet Card Mini in Sidebar */}
      <Link
        href="/ajustes"
        className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EFECE5] hover:border-[#D3DFD7] transition-all block"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#3E5A4D] text-white flex items-center justify-center font-bold text-xs shrink-0">
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
    </aside>
  );
}
