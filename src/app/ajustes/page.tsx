// src/app/ajustes/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { KiraRepository } from '@/lib/storage/repository';
import { Pet } from '@/types/medication';
import { UserSettings } from '@/types/settings';
import {
  Heart,
  MessageSquare,
  Shield,
  Download,
  CheckCircle2,
  Moon,
} from 'lucide-react';

export default function AjustesPage() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [petName, setPetName] = useState('Kira');
  const [petBreed, setPetBreed] = useState('Mestiza');
  const [petWeight, setPetWeight] = useState<number>(24.5);
  const [petNotes, setPetNotes] = useState('');

  const [whatsappPhone, setWhatsappPhone] = useState('+59899123456');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [advanceMinutes, setAdvanceMinutes] = useState(15);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('23:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [inventoryAlerts, setInventoryAlerts] = useState(true);

  useEffect(() => {
    const p = KiraRepository.getPet();
    const s = KiraRepository.getSettings();

    setPet(p);
    setSettings(s);

    setPetName(p.name);
    setPetBreed(p.breed || '');
    setPetWeight(p.weight_kg || 24.5);
    setPetNotes(p.notes || '');

    setWhatsappPhone(s.whatsapp_phone);
    setRemindersEnabled(s.reminders_enabled);
    setAdvanceMinutes(s.advance_notice_minutes);
    setQuietHoursEnabled(s.quiet_hours_enabled);
    setQuietHoursStart(s.quiet_hours_start || '23:00');
    setQuietHoursEnd(s.quiet_hours_end || '07:00');
    setInventoryAlerts(s.inventory_alerts_enabled);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    KiraRepository.updatePet({
      name: petName.trim(),
      breed: petBreed.trim() || undefined,
      weight_kg: Number(petWeight),
      notes: petNotes.trim() || undefined,
    });

    KiraRepository.updateSettings({
      whatsapp_phone: whatsappPhone.trim(),
      reminders_enabled: remindersEnabled,
      advance_notice_minutes: Number(advanceMinutes),
      quiet_hours_enabled: quietHoursEnabled,
      quiet_hours_start: quietHoursStart,
      quiet_hours_end: quietHoursEnd,
      inventory_alerts_enabled: inventoryAlerts,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportJson = () => {
    const data = {
      pet: KiraRepository.getPet(),
      settings: KiraRepository.getSettings(),
      medications: KiraRepository.getMedications(),
      scheduledDoses: KiraRepository.getScheduledDoses(),
      doseLogs: KiraRepository.getDoseHistory(),
      symptoms: KiraRepository.getSymptomLogs(),
      vetVisits: KiraRepository.getVetVisits(),
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kira-care-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#222624]">Ajustes de Kira Care</h1>
        <p className="text-xs text-[#606763] mt-0.5">
          Configuración personal, recordatorios de WhatsApp y respaldo de datos
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-[#E9EFEA] border border-[#D3DFD7] text-[#274033] flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#357A57]" />
          Configuración guardada correctamente
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Pet Profile */}
        <div className="bg-white rounded-2xl border border-[#E5E1D6] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#EFECE5]">
            <Heart className="w-5 h-5 text-[#3E5A4D]" />
            <h2 className="text-sm font-bold text-[#222624]">Perfil de Kira</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#222624] mb-1">Nombre</label>
              <input
                type="text"
                required
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222624] mb-1">Raza / Tipo</label>
              <input
                type="text"
                value={petBreed}
                onChange={(e) => setPetBreed(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222624] mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={petWeight}
                onChange={(e) => setPetWeight(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Notas permanentes de salud o cuidados
            </label>
            <textarea
              rows={2}
              value={petNotes}
              onChange={(e) => setPetNotes(e.target.value)}
              placeholder="Sensibilidad gástrica, alergias o indicaciones especiales..."
              className="w-full text-xs p-3 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D] resize-none"
            />
          </div>
        </div>

        {/* 2. WhatsApp Reminders */}
        <div className="bg-white rounded-2xl border border-[#E5E1D6] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EFECE5]">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-[#3E5A4D]" />
              <div>
                <h2 className="text-sm font-bold text-[#222624]">Recordatorios por WhatsApp</h2>
                <p className="text-[11px] text-[#606763]">Meta Business Cloud API oficial</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={remindersEnabled}
                onChange={(e) => setRemindersEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#E5E1D6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3E5A4D]" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#222624] mb-1">
                Número de WhatsApp de destino
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  required
                  placeholder="+598 99 123 456"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
                />
              </div>
              <p className="text-[10px] text-[#606763] mt-1">Formato internacional recomendado (+598...)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222624] mb-1">
                Anticipación del recordatorio
              </label>
              <select
                value={advanceMinutes}
                onChange={(e) => setAdvanceMinutes(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
              >
                <option value={0}>En el horario exacto de la toma</option>
                <option value={10}>10 minutos antes</option>
                <option value={15}>15 minutos antes (recomendado)</option>
                <option value={30}>30 minutos antes</option>
              </select>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="pt-2 border-t border-[#EFECE5]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-[#606763]" />
                <span className="text-xs font-semibold text-[#222624]">Horario silencioso</span>
              </div>
              <input
                type="checkbox"
                checked={quietHoursEnabled}
                onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#3E5A4D] rounded cursor-pointer"
              />
            </div>

            {quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-[#606763] mb-1">Desde</label>
                  <input
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-[#E5E1D6] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#606763] mb-1">Hasta</label>
                  <input
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-[#E5E1D6] bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. System & Timezone info */}
        <div className="bg-white rounded-2xl border border-[#E5E1D6] p-5 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#EFECE5]">
            <Shield className="w-5 h-5 text-[#3E5A4D]" />
            <h2 className="text-sm font-bold text-[#222624]">Parámetros del Sistema</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[#606763]">
            <div>
              Zona horaria médica: <strong className="text-[#222624]">America/Montevideo (UTC-3)</strong>
            </div>
            <div>
              Moneda local: <strong className="text-[#222624]">UYU ($)</strong>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Guardar Configuración
          </button>
        </div>
      </form>

      {/* Data Export & Backup Section */}
      <div className="bg-white rounded-2xl border border-[#E5E1D6] p-5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-[#222624]">Copia de Seguridad de Datos</h3>
          <p className="text-[11px] text-[#606763]">
            Descargá una copia íntegra en formato JSON con todas las tomas, prescripciones y notas
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportJson}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E5E1D6] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#222624] transition-colors"
        >
          <Download className="w-4 h-4 text-[#3E5A4D]" /> Exportar JSON
        </button>
      </div>
    </div>
  );
}
