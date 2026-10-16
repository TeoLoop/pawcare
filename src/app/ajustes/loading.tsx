// src/app/ajustes/loading.tsx
import React from 'react';

export default function AjustesLoading() {
  return (
    <div className="max-w-3xl space-y-6 animate-pulse">
      <div className="h-8 bg-stone-200 dark:bg-stone-800 rounded-xl w-48 mb-2" />
      <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded-md w-72 mb-6" />

      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-5 space-y-4">
        <div className="h-6 bg-stone-200 dark:bg-stone-800 rounded-md w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="h-28 bg-[#FAF8F5] dark:bg-stone-800/60 rounded-xl" />
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-5 space-y-4">
        <div className="h-6 bg-stone-200 dark:bg-stone-800 rounded-md w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="h-20 bg-[#FAF8F5] dark:bg-stone-800/60 rounded-xl" />
          <div className="h-20 bg-[#FAF8F5] dark:bg-stone-800/60 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
