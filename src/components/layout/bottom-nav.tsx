// src/components/layout/bottom-nav.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, History, Activity, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/medicacion', label: 'Medicación', icon: Pill },
  { href: '/historial', label: 'Historial', icon: History },
  { href: '/salud', label: 'Salud', icon: Activity },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E5E1D6] z-50 px-2 py-2 safe-area-bottom">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all',
                isActive
                  ? 'text-[#274033] font-semibold'
                  : 'text-[#606763] hover:text-[#222624]'
              )}
            >
              <div
                className={cn(
                  'p-1 rounded-lg transition-colors',
                  isActive ? 'bg-[#E9EFEA] text-[#3E5A4D]' : 'text-[#8E9490]'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
