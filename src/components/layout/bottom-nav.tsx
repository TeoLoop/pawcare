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
    <nav className="md:hidden fixed bottom-3 inset-x-3.5 max-w-md mx-auto bg-white/92 dark:bg-[#1C211E]/95 backdrop-blur-xl border border-[#E5E1D6]/90 dark:border-stone-800 rounded-2xl shadow-xl shadow-stone-900/10 dark:shadow-black/40 z-50 px-1.5 py-1.5 transition-all">
      <div className="flex items-center justify-between">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-95',
                isActive
                  ? 'text-[#274033] dark:text-emerald-300 font-bold'
                  : 'text-[#8E9490] dark:text-stone-400 hover:text-[#222624] dark:hover:text-stone-200'
              )}
            >
              <div
                className={cn(
                  'w-9 h-7 flex items-center justify-center rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-[#E9EFEA] dark:bg-emerald-950/70 text-[#3E5A4D] dark:text-emerald-300 scale-105 shadow-2xs'
                    : 'text-[#8E9490] dark:text-stone-400'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
