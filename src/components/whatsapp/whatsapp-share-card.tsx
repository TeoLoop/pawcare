// src/components/whatsapp/whatsapp-share-card.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { KiraRepository } from '@/lib/storage/repository';
import { getLocalDateString } from '@/lib/date-utils';
import { addDays, parseISO, format } from 'date-fns';
import { buildScheduleWhatsAppMessage } from '@/lib/whatsapp/client';
import { Pet, ScheduledDose } from '@/types/medication';
import { MessageSquare, Send, Copy, Check, Calendar, Phone } from 'lucide-react';

interface WhatsAppShareCardProps {
  className?: string;
}

type RangeOption = 'today' | 'tomorrow' | 'today_tomorrow' | 'week' | 'custom';

export function WhatsAppShareCard({ className = '' }: WhatsAppShareCardProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [rangeOption, setRangeOption] = useState<RangeOption>('today_tomorrow');
  const [customStart, setCustomStart] = useState<string>(getLocalDateString());
  const [customEnd, setCustomEnd] = useState<string>(getLocalDateString(addDays(new Date(), 1)));
  const [phone, setPhone] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const allPets = KiraRepository.getPets();
    setPets(allPets);
    const active = KiraRepository.getActivePet();
    if (active?.id) {
      setSelectedPetId(active.id);
    } else if (allPets[0]?.id) {
      setSelectedPetId(allPets[0].id);
    }

    const settings = KiraRepository.getSettings();
    if (settings.whatsapp_phone) {
      setPhone(settings.whatsapp_phone);
    }
  }, []);

  // Compute start and end dates based on option
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const todayStr = getLocalDateString(today);

    switch (rangeOption) {
      case 'today':
        return { startDate: todayStr, endDate: todayStr };
      case 'tomorrow': {
        const tomStr = getLocalDateString(addDays(today, 1));
        return { startDate: tomStr, endDate: tomStr };
      }
      case 'today_tomorrow': {
        const tomStr = getLocalDateString(addDays(today, 1));
        return { startDate: todayStr, endDate: tomStr };
      }
      case 'week': {
        const weekEndStr = getLocalDateString(addDays(today, 6));
        return { startDate: todayStr, endDate: weekEndStr };
      }
      case 'custom':
        return {
          startDate: customStart || todayStr,
          endDate: customEnd || customStart || todayStr,
        };
      default:
        return { startDate: todayStr, endDate: todayStr };
    }
  }, [rangeOption, customStart, customEnd]);

  // Fetch real doses for all dates in range
  const { messageText, shareUrl, dosesCount, petName } = useMemo(() => {
    const pet = pets.find((p) => p.id === selectedPetId) || KiraRepository.getActivePet();
    const name = pet?.name || 'Mascota';

    const doses: ScheduledDose[] = [];

    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);

      // Loop from start to end (up to 30 days max)
      let curr = new Date(start);
      let count = 0;
      while (curr <= end && count < 31) {
        const dateStr = format(curr, 'yyyy-MM-dd');
        const dayDoses = KiraRepository.getScheduledDoses(dateStr, pet?.id);
        doses.push(...dayDoses);
        curr = addDays(curr, 1);
        count++;
      }
    } catch {
      // Fallback
      const dayDoses = KiraRepository.getScheduledDoses(startDate, pet?.id);
      doses.push(...dayDoses);
    }

    const { text, shareUrl: url } = buildScheduleWhatsAppMessage({
      petName: name,
      startDate,
      endDate,
      doses,
      phone: phone.trim(),
    });

    return {
      messageText: text,
      shareUrl: url,
      dosesCount: doses.length,
      petName: name,
    };
  }, [pets, selectedPetId, startDate, endDate, phone]);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-[#E5E1D6] dark:border-slate-800 p-5 shadow-xs space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[#EFECE5] dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#222624] dark:text-slate-100">
              Compartir Recordatorio por WhatsApp
            </h2>
            <p className="text-[11px] text-[#606763] dark:text-slate-400">
              Enviá el cronograma de tomas a cualquier contacto o grupo en 1 clic
            </p>
          </div>
        </div>

        {pets.length > 1 && (
          <select
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-[#E5E1D6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#222624] dark:text-slate-100 font-semibold"
          >
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                🐾 {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Date Range Selection Buttons */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-[#222624] dark:text-slate-200">
          ¿Qué rango de fechas querés enviar?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setRangeOption('today')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-center ${
              rangeOption === 'today'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#606763] dark:text-slate-300 border-[#E5E1D6] dark:border-slate-700 hover:border-emerald-500'
            }`}
          >
            Solo Hoy
          </button>

          <button
            type="button"
            onClick={() => setRangeOption('today_tomorrow')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-center ${
              rangeOption === 'today_tomorrow'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#606763] dark:text-slate-300 border-[#E5E1D6] dark:border-slate-700 hover:border-emerald-500'
            }`}
          >
            Hoy y Mañana
          </button>

          <button
            type="button"
            onClick={() => setRangeOption('week')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-center ${
              rangeOption === 'week'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#606763] dark:text-slate-300 border-[#E5E1D6] dark:border-slate-700 hover:border-emerald-500'
            }`}
          >
            Próximos 7 días
          </button>

          <button
            type="button"
            onClick={() => setRangeOption('custom')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-center ${
              rangeOption === 'custom'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#606763] dark:text-slate-300 border-[#E5E1D6] dark:border-slate-700 hover:border-emerald-500'
            }`}
          >
            Personalizado
          </button>
        </div>

        {rangeOption === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <span className="block text-[11px] text-[#606763] dark:text-slate-400 mb-1">
                Desde
              </span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#222624] dark:text-slate-100"
              />
            </div>
            <div>
              <span className="block text-[11px] text-[#606763] dark:text-slate-400 mb-1">
                Hasta
              </span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#222624] dark:text-slate-100"
              />
            </div>
          </div>
        )}
      </div>

      {/* Optional phone number input */}
      <div>
        <label className="block text-xs font-semibold text-[#222624] dark:text-slate-200 mb-1">
          Número específico (opcional)
        </label>
        <div className="relative">
          <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="tel"
            placeholder="Dejalo vacío para elegir cualquier contacto o grupo en WhatsApp"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#222624] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Message Preview Bubble */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[#606763] dark:text-slate-400">
          <span className="font-semibold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Vista previa del mensaje ({dosesCount} tomas de {petName})
          </span>
          <span>{startDate === endDate ? startDate : `${startDate} al ${endDate}`}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#E8F5E9]/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 text-xs font-mono text-[#1B3828] dark:text-emerald-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed shadow-2xs">
          {messageText}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleShare}
          className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Send className="w-4 h-4" />
          <span>Compartir en WhatsApp (Contacto o Grupo)</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 border border-[#E5E1D6] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#222624] dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? '¡Copiado!' : 'Copiar texto'}</span>
        </button>
      </div>
    </div>
  );
}
