// src/components/layout/top-header.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { formatInMontevideo } from '@/lib/date-utils';
import { MessageSquare } from 'lucide-react';
import { KiraRepository } from '@/lib/storage/repository';

export function TopHeader() {
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [phone, setPhone] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  useEffect(() => {
    // Current date formatted in Spanish
    const dateFormatted = formatInMontevideo(new Date(), "EEEE, d 'de' MMMM");
    // Capitalize first letter
    setCurrentDateStr(dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1));

    const settings = KiraRepository.getSettings();
    setPhone(settings.whatsapp_phone);
    setRemindersEnabled(settings.reminders_enabled);
  }, []);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-[#E5E1D6] sticky top-0 z-40 px-4 sm:px-6 py-3.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#222624]">Kira</h2>
            <span className="w-1.5 h-1.5 rounded-full bg-[#357A57]" />
            <span className="text-xs text-[#606763] hidden sm:inline">America/Montevideo</span>
          </div>
          <p className="text-xs text-[#606763] capitalize">{currentDateStr || 'Hoy'}</p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#E5E1D6] text-xs">
            <MessageSquare className="w-3.5 h-3.5 text-[#3E5A4D]" />
            <span className="hidden sm:inline text-[#606763]">Recordatorios WhatsApp:</span>
            <span
              className={
                remindersEnabled
                  ? 'font-medium text-[#274033]'
                  : 'font-medium text-[#C34A3E]'
              }
            >
              {remindersEnabled ? (phone ? 'Activos' : 'Falta número') : 'Pausados'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
