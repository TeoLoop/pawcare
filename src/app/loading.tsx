// src/app/loading.tsx
import React from 'react';
import { PawIcon } from '@/components/ui/paw-icon';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] dark:bg-emerald-950/40 flex items-center justify-center text-[#3E5A4D] dark:text-emerald-400 shadow-xs animate-pulse">
          <PawIcon className="w-6 h-6 fill-current" />
        </div>
        <p className="text-xs font-semibold text-[#606763] dark:text-stone-400">Cargando PawCare...</p>
      </div>
    </div>
  );
}
