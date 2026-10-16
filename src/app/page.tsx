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
import { PetModal } from '@/components/pet/pet-modal';
import { CloudSyncService } from '@/lib/supabase/sync-service';

export default function HomePage() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [todayDoses, setTodayDoses] = useState<ScheduledDose[]>([]);
  const [activeMeds, setActiveMeds] = useState<Medication[]>([]);
  const [lastSymptom, setLastSymptom] = useState<SymptomLog | null>(null);
  const [nextVetVisit, setNextVetVisit] = useState<VetVisit | null>(null);
  const [isSymptomModalOpen, setIsSymptomModalOpen] = useState(false);
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [isTriggeringReminder, setIsTriggeringReminder] = useState(false);
  const [reminderNotification, setReminderNotification] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
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
    const handleAuthChange = () => {
      refreshData();
    };

    window.addEventListener('pawcare_pet_changed', handlePetChange);
    window.addEventListener('pawcare_synced', handleSynced);
    window.addEventListener('pawcare_auth_changed', handleAuthChange);
    return () => {
      window.removeEventListener('pawcare_pet_changed', handlePetChange);
      window.removeEventListener('pawcare_synced', handleSynced);
      window.removeEventListener('pawcare_auth_changed', handleAuthChange);
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
      {mounted && !isAuthenticated && (
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
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-4 sm:p-6 shadow-xs relative overflow-hidden">
        {mounted && pet?.name ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div
                onClick={() => setIsPetModalOpen(true)}
                title={`Clic para cambiar la foto de ${pet.name} o editar su perfil`}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E9EFEA] dark:bg-emerald-950/40 border-2 border-[#D3DFD7] dark:border-emerald-800 flex items-center justify-center text-[#3E5A4D] dark:text-emerald-400 shrink-0 font-bold text-2xl shadow-xs overflow-hidden cursor-pointer relative group hover:opacity-90 transition-opacity"
              >
                {pet.photo_url ? (
                  <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <span>🐾</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                  Editar
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#222624] dark:text-stone-100 tracking-tight truncate">
                    {pet.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/50 dark:border dark:border-emerald-800 dark:text-emerald-300 shrink-0">
                    {pet.species || 'Mascota'}
                  </span>
                </div>
                <p className="text-xs text-[#606763] dark:text-stone-400 mt-0.5 truncate">
                  {pet.breed ? `${pet.breed} • ` : ''}{pet.weight_kg ? `${pet.weight_kg} kg • ` : ''}Tratamiento diario
                </p>
                {pet.notes && (
                  <p className="text-[11px] text-[#606763] dark:text-stone-400 italic mt-1 line-clamp-1 max-w-xl">
                    &ldquo;{pet.notes}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions for Mobile & Desktop */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2.5 pt-2 sm:pt-0 border-t sm:border-0 border-[#EFECE5] dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsSymptomModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-[#FAF8F5] dark:hover:bg-stone-700 text-xs font-semibold text-[#222624] dark:text-stone-100 transition-colors shadow-xs"
              >
                <Activity className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400" />
                <span>Anotar Salud</span>
              </button>
              <Link
                href="/medicacion"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-xs font-semibold text-white transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Medicación</span>
              </Link>
            </div>
          </div>
        ) : mounted ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#222624] dark:text-stone-100">¡Bienvenido a PawCare!</h1>
              <p className="text-xs text-[#606763] dark:text-stone-400 mt-1">
                Registrá tu primera mascota para gestionar sus medicamentos, recordatorios de WhatsApp y salud.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPetModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-xs font-bold text-white transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Registrar Mascota
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 animate-pulse py-1">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-stone-100 dark:bg-stone-800" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-36 bg-stone-200 dark:bg-stone-800 rounded-md" />
              <div className="h-4 w-48 bg-stone-100 dark:bg-stone-850 rounded-md" />
            </div>
          </div>
        )}

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#606763] dark:text-stone-400 mb-1">
            <span className="text-[11px] sm:text-xs font-medium">Próxima toma</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3E5A4D] dark:text-emerald-400" />
          </div>
          <p className="text-base sm:text-lg font-bold text-[#222624] dark:text-stone-100 tracking-tight">
            {nextDose ? `${nextDose.scheduled_time} hs` : 'Sin pendientes'}
          </p>
          <p className="text-[10px] sm:text-[11px] text-[#606763] dark:text-stone-400 truncate mt-0.5">
            {nextDose?.medication?.name || 'Todo al día por hoy'}
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#606763] dark:text-stone-400 mb-1">
            <span className="text-[11px] sm:text-xs font-medium">Dosis de hoy</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#357A57] dark:text-emerald-400" />
          </div>
          <p className="text-base sm:text-lg font-bold text-[#222624] dark:text-stone-100 tracking-tight">
            {administeredToday} / {todayDoses.length}
          </p>
          <p className="text-[10px] sm:text-[11px] text-[#606763] dark:text-stone-400 mt-0.5">
            {pendingOrDelayed} {pendingOrDelayed === 1 ? 'por administrar' : 'por administrar'}
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#606763] dark:text-stone-400 mb-1">
            <span className="text-[11px] sm:text-xs font-medium">Medicamentos</span>
            <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3E5A4D] dark:text-emerald-400" />
          </div>
          <p className="text-base sm:text-lg font-bold text-[#222624] dark:text-stone-100 tracking-tight">
            {activeMeds.length} activos
          </p>
          <p className="text-[10px] sm:text-[11px] text-[#606763] dark:text-stone-400 mt-0.5">Pautas prescritas</p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#606763] dark:text-stone-400 mb-1">
            <span className="text-[11px] sm:text-xs font-medium">Estado de dolor</span>
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3E5A4D] dark:text-emerald-400" />
          </div>
          <p className="text-base sm:text-lg font-bold text-[#222624] dark:text-stone-100 tracking-tight">
            {lastSymptom ? `${lastSymptom.pain_level}/10` : 'Sin datos'}
          </p>
          <p className="text-[10px] sm:text-[11px] text-[#606763] dark:text-stone-400 truncate mt-0.5">
            {lastSymptom ? `Movilidad: ${lastSymptom.mobility}` : 'Registrá hoy'}
          </p>
        </div>
      </div>

      {/* 3. Main Daily Doses Timeline */}
      <DailyDoses doses={todayDoses} onRefresh={refreshData} />

      {/* 4. Secondary Grid: WhatsApp Scheduler & Vet Checkup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* WhatsApp Reminders Status Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#222624] dark:text-stone-100">Recordatorios WhatsApp</h3>
                  <p className="text-[11px] text-[#606763] dark:text-stone-400">Directo wa.me & CallMeBot (sin Meta)</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 text-[#274033] dark:text-emerald-300">
                Montevideo
              </span>
            </div>
            <p className="text-xs text-[#606763] dark:text-stone-400 leading-relaxed mb-4">
              Avisos instantáneos con un toque para enviar la dosis a tu WhatsApp personal o de familiares, sin necesidad de cuenta de empresa en Meta.
            </p>

            {reminderNotification && (
              <div className="mb-3 p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 text-xs text-[#222624] dark:text-stone-200">
                {reminderNotification}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-[#EFECE5] dark:border-stone-800">
            <Link
              href="/ajustes"
              className="text-xs font-semibold text-[#3E5A4D] dark:text-emerald-400 hover:underline"
            >
              Configurar teléfono y horarios →
            </Link>
            <button
              type="button"
              onClick={handleTestCronReminder}
              disabled={isTriggeringReminder}
              className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 sm:py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 hover:bg-[#EFECE5] dark:hover:bg-stone-700 text-xs font-medium text-[#222624] dark:text-stone-200 transition-colors disabled:opacity-50"
            >
              {isTriggeringReminder ? 'Verificando...' : 'Probar recordatorios ahora'}
            </button>
          </div>
        </div>

        {/* Vet Appointment Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#222624] dark:text-stone-100">Próximo Control Veterinario</h3>
                  <p className="text-[11px] text-[#606763] dark:text-stone-400">Seguimiento clínico programado</p>
                </div>
              </div>
            </div>

            {nextVetVisit ? (
              <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-stone-800/60 border border-[#EFECE5] dark:border-stone-700 mb-2 text-xs">
                <p className="font-semibold text-[#222624] dark:text-stone-100">
                  {formatInMontevideo(nextVetVisit.next_appointment_at!, "EEEE d 'de' MMMM, HH:mm")} hs
                </p>
                <p className="text-[#606763] dark:text-stone-400 mt-0.5">
                  {nextVetVisit.clinic_name} • {nextVetVisit.veterinarian_name}
                </p>
                <p className="text-[#3E5A4D] dark:text-emerald-400 mt-1 font-medium">Motivo: {nextVetVisit.reason}</p>
              </div>
            ) : (
              <p className="text-xs text-[#606763] dark:text-stone-400 leading-relaxed mb-4">
                No hay controles veterinarios futuros agendados. Podés registrar uno en la sección de Salud.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-[#EFECE5] dark:border-stone-800 flex items-center justify-between">
            <Link
              href="/salud"
              className="text-xs font-semibold text-[#3E5A4D] dark:text-emerald-400 hover:underline"
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

      {/* Pet Registration / Edit Modal */}
      <PetModal
        isOpen={isPetModalOpen}
        onClose={() => setIsPetModalOpen(false)}
        onSuccess={refreshData}
        petToEdit={pet}
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
