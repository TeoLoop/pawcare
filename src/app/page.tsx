// src/app/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KiraRepository } from '@/lib/storage/repository';
import { Pet, ScheduledDose, Medication } from '@/types/medication';
import { SymptomLog } from '@/types/health';
import { VetVisit } from '@/types/veterinary';
import { DailyDoses } from '@/components/dashboard/daily-doses';
import { SymptomFormModal } from '@/components/health/symptom-form-modal';
import { formatInMontevideo } from '@/lib/date-utils';
import {
  Pill,
  Clock,
  Activity,
  Calendar,
  AlertTriangle,
  Plus,
  Send,
  CheckCircle2,
  Cloud,
} from 'lucide-react';
import { AuthModal } from '@/components/auth/auth-modal';
import { CloudSyncService } from '@/lib/supabase/sync-service';

export default function HomePage() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [todayDoses, setTodayDoses] = useState<ScheduledDose[]>([]);
  const [activeMeds, setActiveMeds] = useState<Medication[]>([]);
  const [lastSymptom, setLastSymptom] = useState<SymptomLog | null>(null);
  const [nextVetVisit, setNextVetVisit] = useState<VetVisit | null>(null);
  const [isSymptomModalOpen, setIsSymptomModalOpen] = useState(false);
  const [isTriggeringReminder, setIsTriggeringReminder] = useState(false);
  const [reminderNotification, setReminderNotification] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshData = () => {
    const p = KiraRepository.getPet();
    setPet(p);

    const doses = KiraRepository.getScheduledDoses();
    setTodayDoses(doses);

    const meds = KiraRepository.getMedications().filter((m) => m.is_active);
    setActiveMeds(meds);

    const symptoms = KiraRepository.getSymptomLogs();
    setLastSymptom(symptoms.length > 0 ? symptoms[0] : null);

    const visits = KiraRepository.getVetVisits();
    // find next upcoming appointment
    const upcoming = visits.find(
      (v) => v.next_appointment_at && new Date(v.next_appointment_at) > new Date()
    );
    setNextVetVisit(upcoming || null);

    const status = CloudSyncService.getStatus();
    setIsAuthenticated(status.isAuthenticated);
  };

  useEffect(() => {
    refreshData();

    CloudSyncService.init().then(() => {
      refreshData();
    });

    const handlePetChange = () => {
      refreshData();
    };
    const handleSynced = () => {
      refreshData();
    };

    window.addEventListener('pawcare_pet_changed', handlePetChange);
    window.addEventListener('pawcare_synced', handleSynced);
    return () => {
      window.removeEventListener('pawcare_pet_changed', handlePetChange);
      window.removeEventListener('pawcare_synced', handleSynced);
    };
  }, []);

  // Stats calculation
  const administeredToday = todayDoses.filter((d) => d.status === 'administered').length;
  const pendingOrDelayed = todayDoses.filter(
    (d) => d.status === 'pending' || d.status === 'delayed' || d.status === 'scheduled'
  ).length;
  const delayedCount = todayDoses.filter((d) => d.status === 'delayed').length;

  // Next upcoming dose
  const nextDose = todayDoses.find(
    (d) => d.status === 'scheduled' || d.status === 'pending' || d.status === 'delayed'
  );

  const handleTestCronReminder = async () => {
    setIsTriggeringReminder(true);
    setReminderNotification(null);
    try {
      const res = await fetch('/api/cron/send-reminders', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setReminderNotification(
          `Recordatorios procesados: ${data.processedCount} enviados (${data.successCount} exitosos)`
        );
      } else {
        setReminderNotification(`Error: ${data.error || 'No se pudo procesar'}`);
      }
      refreshData();
    } catch {
      setReminderNotification('Error de conexión al procesar recordatorios');
    } finally {
      setIsTriggeringReminder(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cloud Authentication Banner if not logged in */}
      {!isAuthenticated && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-850 border border-emerald-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-stone-800 border border-emerald-200 dark:border-stone-700 flex items-center justify-center text-[#3E5A4D] dark:text-emerald-400 shrink-0 shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#222624] dark:text-stone-100">
                Conectá tu cuenta de PawCare
              </h2>
              <p className="text-xs text-[#606763] dark:text-stone-400 mt-0.5">
                Iniciá sesión o creá tu cuenta para sincronizar tus mascotas y dosis en la nube en tiempo real.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 bg-[#3E5A4D] hover:bg-[#32493E] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Iniciar Sesión / Crear Cuenta
            </button>
          </div>
        </div>
      )}

      {/* 1. Pet Hero Card */}
      <div className="bg-white rounded-3xl border border-[#E5E1D6] p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#E9EFEA] border-2 border-[#D3DFD7] flex items-center justify-center text-[#3E5A4D] shrink-0 font-bold text-2xl shadow-xs">
              🐾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#222624] tracking-tight">
                  {pet?.name || 'Kira'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E9EFEA] text-[#274033]">
                  {pet?.species || 'Canino'}
                </span>
              </div>
              <p className="text-xs text-[#606763] mt-0.5">
                {pet?.breed || 'Mestiza'} • {pet?.weight_kg || 24.5} kg • Tratamiento y bienestar diario
              </p>
              {pet?.notes && (
                <p className="text-[11px] text-[#606763] italic mt-1 max-w-xl">
                  &ldquo;{pet.notes}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsSymptomModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E5E1D6] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#222624] transition-colors shadow-xs"
            >
              <Activity className="w-4 h-4 text-[#3E5A4D]" />
              Anotar Salud
            </button>
            <Link
              href="/medicacion"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-xs font-semibold text-white transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Nueva Medicación
            </Link>
          </div>
        </div>

        {/* Delayed Alert Banner if any */}
        {delayedCount > 0 && (
          <div className="mt-5 p-3.5 rounded-xl bg-[#FFF5E6] border border-[#FFE0B2] flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#C97A24] shrink-0 mt-0.5" />
            <div className="text-xs text-[#8A5300]">
              <strong className="font-semibold">
                Hay {delayedCount} {delayedCount === 1 ? 'dosis retrasada' : 'dosis retrasadas'}:
              </strong>{' '}
              Revisá el horario previsto en la lista inferior y registrá lo sucedido. No administrés dosis dobles o compensatorias sin consultar antes al veterinario.
            </div>
          </div>
        )}
      </div>

      {/* 2. Today Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-[#E5E1D6] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#606763] mb-1">
            <span className="text-xs font-medium">Próxima toma</span>
            <Clock className="w-4 h-4 text-[#3E5A4D]" />
          </div>
          <p className="text-lg font-bold text-[#222624] tracking-tight">
            {nextDose ? `${nextDose.scheduled_time} hs` : 'Sin pendientes'}
          </p>
          <p className="text-[11px] text-[#606763] truncate">
            {nextDose?.medication?.name || 'Todo al día por hoy'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E1D6] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#606763] mb-1">
            <span className="text-xs font-medium">Dosis de hoy</span>
            <CheckCircle2 className="w-4 h-4 text-[#357A57]" />
          </div>
          <p className="text-lg font-bold text-[#222624] tracking-tight">
            {administeredToday} / {todayDoses.length}
          </p>
          <p className="text-[11px] text-[#606763]">
            {pendingOrDelayed} {pendingOrDelayed === 1 ? 'por administrar' : 'por administrar'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E1D6] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#606763] mb-1">
            <span className="text-xs font-medium">Medicamentos</span>
            <Pill className="w-4 h-4 text-[#3E5A4D]" />
          </div>
          <p className="text-lg font-bold text-[#222624] tracking-tight">
            {activeMeds.length} activos
          </p>
          <p className="text-[11px] text-[#606763]">Pautas prescritas</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E1D6] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#606763] mb-1">
            <span className="text-xs font-medium">Estado de dolor</span>
            <Activity className="w-4 h-4 text-[#3E5A4D]" />
          </div>
          <p className="text-lg font-bold text-[#222624] tracking-tight">
            {lastSymptom ? `${lastSymptom.pain_level}/10` : 'Sin datos'}
          </p>
          <p className="text-[11px] text-[#606763] truncate">
            {lastSymptom ? `Movilidad: ${lastSymptom.mobility}` : 'Registrá hoy'}
          </p>
        </div>
      </div>

      {/* 3. Main Daily Doses Timeline */}
      <DailyDoses doses={todayDoses} onRefresh={refreshData} />

      {/* 4. Secondary Grid: WhatsApp Scheduler & Vet Checkup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* WhatsApp Cloud Reminders Status Card */}
        <div className="bg-white rounded-2xl border border-[#E5E1D6] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E9EFEA] text-[#3E5A4D] flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#222624]">Recordatorios WhatsApp</h3>
                  <p className="text-[11px] text-[#606763]">Meta Cloud API oficial programada</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF8F5] border border-[#E5E1D6] text-[#274033]">
                Montevideo
              </span>
            </div>
            <p className="text-xs text-[#606763] leading-relaxed mb-4">
              Los avisos se programan antes de cada dosis con enlaces seguros de confirmación de un solo uso.
            </p>

            {reminderNotification && (
              <div className="mb-3 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E1D6] text-xs text-[#222624]">
                {reminderNotification}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#EFECE5]">
            <Link
              href="/ajustes"
              className="text-xs font-semibold text-[#3E5A4D] hover:underline"
            >
              Configurar teléfono y horarios →
            </Link>
            <button
              type="button"
              onClick={handleTestCronReminder}
              disabled={isTriggeringReminder}
              className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E5E1D6] hover:bg-[#EFECE5] text-xs font-medium text-[#222624] transition-colors disabled:opacity-50"
            >
              {isTriggeringReminder ? 'Verificando...' : 'Probar recordatorios ahora'}
            </button>
          </div>
        </div>

        {/* Vet Appointment Card */}
        <div className="bg-white rounded-2xl border border-[#E5E1D6] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E9EFEA] text-[#3E5A4D] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#222624]">Próximo Control Veterinario</h3>
                  <p className="text-[11px] text-[#606763]">Seguimiento clínico programado</p>
                </div>
              </div>
            </div>

            {nextVetVisit ? (
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFECE5] mb-2 text-xs">
                <p className="font-semibold text-[#222624]">
                  {formatInMontevideo(nextVetVisit.next_appointment_at!, "EEEE d 'de' MMMM, HH:mm")} hs
                </p>
                <p className="text-[#606763] mt-0.5">
                  {nextVetVisit.clinic_name} • {nextVetVisit.veterinarian_name}
                </p>
                <p className="text-[#3E5A4D] mt-1 font-medium">Motivo: {nextVetVisit.reason}</p>
              </div>
            ) : (
              <p className="text-xs text-[#606763] leading-relaxed mb-4">
                No hay controles veterinarios futuros agendados. Podés registrar uno en la sección de Salud.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-[#EFECE5] flex items-center justify-between">
            <Link
              href="/salud"
              className="text-xs font-semibold text-[#3E5A4D] hover:underline"
            >
              Ver historial clínico y estudios →
            </Link>
          </div>
        </div>
      </div>

      {/* Symptom Modal Form */}
      <SymptomFormModal
        isOpen={isSymptomModalOpen}
        onClose={() => setIsSymptomModalOpen(false)}
        onSuccess={refreshData}
      />

      {/* Supabase Cloud Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => refreshData()}
      />
    </div>
  );
}
