// src/components/theme/theme-toggle.tsx
'use client';

import React from 'react';
import { useTheme } from './theme-provider';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Cambiar modo de color"
      title={resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`p-2 rounded-xl border border-[#E5E1D6] dark:border-[#2A2A2A] hover:bg-[#FAF8F5] dark:hover:bg-[#252525] text-[#606763] dark:text-[#E0E0E0] transition-colors ${className}`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-4 h-4 text-[#FBBF24]" />
      ) : (
        <Moon className="w-4 h-4 text-[#3E5A4D]" />
      )}
    </button>
  );
}
