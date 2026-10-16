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
  Sun,
  Laptop,
  Plus,
  Edit2,
  Trash2,
  Check,
  Cloud,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { PetModal } from '@/components/pet/pet-modal';
import { AuthModal } from '@/components/auth/auth-modal';
import { CloudSyncService, SyncStatus } from '@/lib/supabase/sync-service';
import { isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { SupabaseCloudRepository } from '@/lib/supabase/cloud-repository';
import { SupabaseAuthService } from '@/lib/supabase/auth-service';

export default function AjustesPage() {
  const { theme, setTheme } = useTheme();
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSettingsFeedback, setSaveSettingsFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [petToEdit, setPetToEdit] = useState<Pet | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(CloudSyncService.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Settings form states
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [advanceMinutes, setAdvanceMinutes] = useState(15);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('23:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [inventoryAlerts, setInventoryAlerts] = useState(true);

  const loadAllData = () => {
    setPets(KiraRepository.getPets());
    setActivePet(KiraRepository.getActivePet());

    const s = KiraRepository.getSettings();
    setSettings(s);
    if (s?.whatsapp_phone) {
      setWhatsappPhone(s.whatsapp_phone);
    }
    setRemindersEnabled(s.reminders_enabled);
    setAdvanceMinutes(s.advance_notice_minutes);
    setQuietHoursEnabled(s.quiet_hours_enabled);
    setQuietHoursStart(s.quiet_hours_start || '23:00');
    setQuietHoursEnd(s.quiet_hours_end || '07:00');
    setInventoryAlerts(s.inventory_alerts_enabled);

    // Actively refresh settings from Supabase
    if (isLiveSupabaseConfigured()) {
      SupabaseCloudRepository.getUserSettings().then((cloudSettings) => {
        if (cloudSettings) {
          KiraRepository.setUserSettingsFromCloud(cloudSettings);
          setSettings(cloudSettings);
          if (cloudSettings.whatsapp_phone) {
            setWhatsappPhone(cloudSettings.whatsapp_phone);
          }
          if (typeof cloudSettings.reminders_enabled === 'boolean') {
            setRemindersEnabled(cloudSettings.reminders_enabled);
          }
          if (cloudSettings.advance_notice_minutes) {
            setAdvanceMinutes(cloudSettings.advance_notice_minutes);
          }
        }
      }).catch(console.warn);
    }
  };

  useEffect(() => {
    loadAllData();

    CloudSyncService.init().then(() => {
      setSyncStatus(CloudSyncService.getStatus());
      loadAllData();
    });

    const handlePetChange = () => {
      loadAllData();
    };
    const handleSynced = () => {
      setSyncStatus(CloudSyncService.getStatus());
      loadAllData();
    };

    window.addEventListener('pawcare_pet_changed', handlePetChange);
    window.addEventListener('pawcare_synced', handleSynced);
    return () => {
      window.removeEventListener('pawcare_pet_changed', handlePetChange);
      window.removeEventListener('pawcare_synced', handleSynced);
    };
  }, []);

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    const res = await CloudSyncService.syncFromCloud();
    setIsSyncing(false);
    if (res.success) {
      setSyncMessage('Datos sincronizados correctamente con Supabase.');
      loadAllData();
    } else {
      setSyncMessage(res.error || 'Error al sincronizar con Supabase.');
    }
  };

  const handleSignOut = async () => {
    setIsSyncing(true);
    await SupabaseAuthService.signOut();
    KiraRepository.clearAllData();
    setIsSyncing(false);
    window.location.href = '/login';
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveSettingsFeedback(null);

    const updated = KiraRepository.updateSettings({
      whatsapp_phone: whatsappPhone.trim(),
      reminders_enabled: remindersEnabled,
      advance_notice_minutes: Number(advanceMinutes),
      quiet_hours_enabled: quietHoursEnabled,
      quiet_hours_start: quietHoursStart,
      quiet_hours_end: quietHoursEnd,
      inventory_alerts_enabled: inventoryAlerts,
    });

    if (isLiveSupabaseConfigured()) {
      try {
        const cloudResult = await SupabaseCloudRepository.updateUserSettings(updated);
        if (cloudResult) {
          setSaveSettingsFeedback({
            type: 'success',
            message: 'Configuración guardada y sincronizada en Supabase con éxito.',
          });
          setSyncStatus(CloudSyncService.getStatus());
        } else {
          setSaveSettingsFeedback({
            type: 'warning',
            message: 'Configuración guardada en este navegador. Para sincronizarla en la nube, iniciá sesión en Supabase arriba.',
          });
        }
      } catch (err: unknown) {
        setSaveSettingsFeedback({
          type: 'warning',
          message: 'Guardado localmente, pero hubo un error de conexión con Supabase.',
        });
      }
    } else {
      setSaveSettingsFeedback({
        type: 'success',
        message: 'Configuración guardada localmente.',
      });
    }

    setIsSavingSettings(false);
    setTimeout(() => setSaveSettingsFeedback(null), 5000);
  };

  const handleSelectActivePet = (petId: string) => {
    KiraRepository.setActivePetId(petId);
    loadAllData();
  };

  const handleDeletePet = (pet: Pet) => {
    if (pets.length <= 1) {
      alert('Tenés que mantener al menos una mascota en la aplicación.');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar el perfil de ${pet.name}?`)) {
      KiraRepository.deletePet(pet.id);
      loadAllData();
    }
  };

  const handleExportJson = () => {
    const data = {
      pets: KiraRepository.getPets(),
      activePetId: KiraRepository.getActivePetId(),
      settings: KiraRepository.getSettings(),
      medications: KiraRepository.getMedications('all'),
      scheduledDoses: KiraRepository.getScheduledDoses(undefined, 'all'),
      doseLogs: KiraRepository.getDoseHistory({ petId: 'all' }),
      symptoms: KiraRepository.getSymptomLogs('all'),
      vetVisits: KiraRepository.getVetVisits('all'),
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pawcare-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#222624]">Ajustes de PawCare</h1>
        <p className="text-xs text-[#606763] mt-0.5">
          Gestión de perfiles de mascotas, recordatorios de WhatsApp y preferencias
        </p>
      </div>

      {saveSettingsFeedback && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in ${
            saveSettingsFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-850 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
              : saveSettingsFeedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
              : 'bg-[#E9EFEA] border-[#D3DFD7] text-[#274033] dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
          }`}
        >
          {saveSettingsFeedback.type === 'error' || saveSettingsFeedback.type === 'warning' ? (
            <AlertCircle className={`w-4 h-4 shrink-0 ${saveSettingsFeedback.type === 'error' ? 'text-rose-600' : 'text-amber-600'}`} />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#357A57]" />
          )}
          <span>{saveSettingsFeedback.message}</span>
        </div>
      )}

      {/* 1. Multi-Pet Profile Management */}
      <div className="bg-white rounded-2xl border border-[#E5E1D6] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EFECE5]">
          <div className="flex items-center gap-2.5">
            <Heart className="w-5 h-5 text-[#3E5A4D]" />
            <div>
              <h2 className="text-sm font-bold text-[#222624]">Perfiles de Mascotas</h2>
              <p className="text-[11px] text-[#606763]">Cambiá de perfil o añadí más mascotas</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPetToEdit(null);
              setIsPetModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Mascota
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pets.map((p) => {
            const isActive = activePet?.id === p.id;
            return (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'border-[#3E5A4D] bg-[#F4F8F5]'
                    : 'border-[#E5E1D6] bg-white hover:bg-[#FAF8F5]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E1D6] flex items-center justify-center text-sm shadow-2xs">
                        🐾
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-[#222624]">{p.name}</h3>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E9EFEA] text-[#274033] border border-[#D3DFD7]">
                              Activa
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#606763]">
                          {p.species} {p.breed ? `• ${p.breed}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setPetToEdit(p);
                          setIsPetModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-[#606763] hover:text-[#222624] hover:bg-[#EFECE5]"
                        title="Editar perfil"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {pets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePet(p)}
                          className="p-1.5 rounded-lg text-[#C34A3E] hover:bg-[#FDF2F0]"
                          title="Eliminar mascota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {p.weight_kg && (
                    <p className="text-[11px] text-[#606763] mt-1">
                      Peso: <strong>{p.weight_kg} kg</strong>
                      {p.birth_date && ` • Nacimiento: ${p.birth_date}`}
                    </p>
                  )}

                  {p.notes && (
                    <p className="text-[11px] text-[#606763] italic mt-1 line-clamp-2">
                      &ldquo;{p.notes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-[#EFECE5] flex items-center justify-between">
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#357A57]">
                      <Check className="w-3.5 h-3.5" /> Perfil seleccionado
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectActivePet(p.id)}
                      className="text-xs font-semibold text-[#3E5A4D] hover:underline"
                    >
                      Seleccionar perfil de {p.name} →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Mi Cuenta y Nube (Supabase) */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EFECE5] dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E9EFEA] dark:bg-emerald-950/40 flex items-center justify-center text-[#3E5A4D] dark:text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#222624] dark:text-stone-100">
                Mi Cuenta & Base de Datos
              </h2>
              <p className="text-[11px] text-[#606763] dark:text-stone-400">
                Conectado con Supabase PostgreSQL y sincronización en tiempo real
              </p>
            </div>
          </div>

          {syncStatus.isAuthenticated && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E9EFEA] text-[#274033] border border-[#D3DFD7] dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-[#357A57] animate-pulse" />
              Nube conectada
            </span>
          )}
        </div>

        {syncMessage && (
          <div className="p-3 bg-[#E9EFEA] dark:bg-emerald-950/40 border border-[#D3DFD7] dark:border-emerald-800 rounded-xl text-xs font-semibold text-[#274033] dark:text-emerald-300 animate-in fade-in">
            {syncMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-[#FAF8F5] dark:bg-stone-800/60 rounded-xl border border-[#E5E1D6] dark:border-stone-700">
            <span className="text-[10px] uppercase font-bold text-[#606763] dark:text-stone-400 block tracking-wider">
              Usuario de Supabase
            </span>
            <div className="flex items-center gap-2 mt-1">
              <UserIcon className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400" />
              <span className="text-xs font-bold text-[#222624] dark:text-stone-100 truncate">
                {syncStatus.isAuthenticated ? syncStatus.userEmail : 'Sesión no iniciada'}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-[#FAF8F5] dark:bg-stone-800/60 rounded-xl border border-[#E5E1D6] dark:border-stone-700">
            <span className="text-[10px] uppercase font-bold text-[#606763] dark:text-stone-400 block tracking-wider">
              Última Sincronización
            </span>
            <span className="text-xs font-bold text-[#222624] dark:text-stone-200 mt-1 block">
              {syncStatus.lastSyncedAt
                ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'Sincronizado'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EFECE5] dark:border-stone-800">
          <button
            type="button"
            onClick={handleSyncCloud}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#FAF8F5] dark:bg-stone-800 hover:bg-[#EFECE5] dark:hover:bg-stone-700 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-xs font-semibold text-[#222624] dark:text-stone-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar ahora
          </button>

          {syncStatus.isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { window.location.href = '/login'; }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#3E5A4D] hover:bg-[#32493E] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 3. WhatsApp Reminders */}
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
              <input
                type="tel"
                required
                placeholder="+598 99 123 456"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
              />
              <p className="text-[10px] text-[#606763] mt-1">Formato internacional (+598...)</p>
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

        {/* 3. Appearance (Modo Claro / Oscuro) */}
        <div className="bg-white rounded-2xl border border-[#E5E1D6] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#EFECE5]">
            <Moon className="w-5 h-5 text-[#3E5A4D]" />
            <div>
              <h2 className="text-sm font-bold text-[#222624]">Apariencia & Modo Oscuro</h2>
              <p className="text-[11px] text-[#606763]">Seleccioná el tema visual de la aplicación</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'border-[#3E5A4D] bg-[#E9EFEA] text-[#274033] shadow-xs'
                  : 'border-[#E5E1D6] bg-white text-[#606763] hover:bg-[#FAF8F5]'
              }`}
            >
              <Sun className="w-4 h-4 text-[#C97A24]" />
              <span>Modo Claro</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'border-[#3E5A4D] bg-[#E9EFEA] text-[#274033] shadow-xs'
                  : 'border-[#E5E1D6] bg-white text-[#606763] hover:bg-[#FAF8F5]'
              }`}
            >
              <Moon className="w-4 h-4 text-[#3E5A4D]" />
              <span>Modo Oscuro</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                theme === 'system'
                  ? 'border-[#3E5A4D] bg-[#E9EFEA] text-[#274033] shadow-xs'
                  : 'border-[#E5E1D6] bg-white text-[#606763] hover:bg-[#FAF8F5]'
              }`}
            >
              <Laptop className="w-4 h-4 text-[#606763]" />
              <span>Automático</span>
            </button>
          </div>
        </div>

        {/* 4. System & Timezone info */}
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
            disabled={isSavingSettings}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            {isSavingSettings && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {isSavingSettings ? 'Guardando en Supabase...' : 'Guardar Ajustes'}
          </button>
        </div>
      </form>

      {/* Data Export & Backup Section */}
      <div className="bg-white rounded-2xl border border-[#E5E1D6] p-5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-[#222624]">Copia de Seguridad de Datos</h3>
          <p className="text-[11px] text-[#606763]">
            Descargá una copia en formato JSON con todas tus mascotas, tomas y recetas
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

      <PetModal
        isOpen={isPetModalOpen}
        onClose={() => {
          setIsPetModalOpen(false);
          setPetToEdit(null);
        }}
        onSuccess={() => {
          loadAllData();
        }}
        petToEdit={petToEdit}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setSyncStatus(CloudSyncService.getStatus());
          loadAllData();
        }}
      />
    </div>
  );
}
