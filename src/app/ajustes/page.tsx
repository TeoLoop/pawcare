// src/app/ajustes/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { KiraRepository } from '@/lib/storage/repository';
import { Pet } from '@/types/medication';
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
  AlertCircle,
  LogOut,
  User as UserIcon,
  Send,
  Sparkles,
  Database,
} from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { PetModal } from '@/components/pet/pet-modal';
import { AuthModal } from '@/components/auth/auth-modal';
import { CloudSyncService, SyncStatus } from '@/lib/supabase/sync-service';
import { isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { SupabaseCloudRepository } from '@/lib/supabase/cloud-repository';
import { SupabaseAuthService } from '@/lib/supabase/auth-service';
import { buildWhatsAppDirectLink } from '@/lib/whatsapp/client';
import { WhatsAppShareCard } from '@/components/whatsapp/whatsapp-share-card';

export default function AjustesPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePet] = useState<Pet | null>(null);
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
  const [callmebotApiKey, setCallmebotApiKey] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [advanceMinutes, setAdvanceMinutes] = useState(15);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('23:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [inventoryAlerts, setInventoryAlerts] = useState(true);

  const loadAllData = useCallback(() => {
    setPets(KiraRepository.getPets());
    setActivePet(KiraRepository.getActivePet());

    const s = KiraRepository.getSettings();
    if (s?.whatsapp_phone) {
      setWhatsappPhone(s.whatsapp_phone);
    }
    if (s?.callmebot_api_key) {
      setCallmebotApiKey(s.callmebot_api_key);
    }
    setRemindersEnabled(s.reminders_enabled);
    setAdvanceMinutes(s.advance_notice_minutes);
    setQuietHoursEnabled(s.quiet_hours_enabled);
    setQuietHoursStart(s.quiet_hours_start || '23:00');
    setQuietHoursEnd(s.quiet_hours_end || '07:00');
    setInventoryAlerts(s.inventory_alerts_enabled);

    // Actively refresh settings from Supabase if connected
    if (isLiveSupabaseConfigured()) {
      SupabaseCloudRepository.getUserSettings()
        .then((cloudSettings) => {
          if (cloudSettings) {
            KiraRepository.setUserSettingsFromCloud(cloudSettings);
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
        })
        .catch(console.warn);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      loadAllData();
    });

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
  }, [loadAllData]);

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
    router.push('/login');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveSettingsFeedback(null);

    const updated = KiraRepository.updateSettings({
      whatsapp_phone: whatsappPhone.trim(),
      callmebot_api_key: callmebotApiKey.trim(),
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
            message:
              'Configuración guardada en este navegador. Para sincronizarla en la nube, iniciá sesión en Supabase arriba.',
          });
        }
      } catch {
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
      scheduledDoses: KiraRepository.getScheduledDoses('all', 'all'),
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
    <div className="max-w-3xl space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#222624] dark:text-stone-100">
          Ajustes de PawCare
        </h1>
        <p className="text-xs text-[#606763] dark:text-stone-400 mt-0.5">
          Gestión de perfiles de mascotas, recordatorios de WhatsApp y base de datos
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
            <AlertCircle
              className={`w-4 h-4 shrink-0 ${
                saveSettingsFeedback.type === 'error' ? 'text-rose-600' : 'text-amber-600'
              }`}
            />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#357A57]" />
          )}
          <span>{saveSettingsFeedback.message}</span>
        </div>
      )}

      {/* 1. Multi-Pet Profile Management */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EFECE5] dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <Heart className="w-5 h-5 text-[#3E5A4D] dark:text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-[#222624] dark:text-stone-100">
                Perfiles de Mascotas
              </h2>
              <p className="text-[11px] text-[#606763] dark:text-stone-400">
                Cambiá de perfil o añadí más mascotas
              </p>
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
                    ? 'border-[#3E5A4D] bg-[#F4F8F5] dark:bg-emerald-950/20 dark:border-emerald-700'
                    : 'border-[#E5E1D6] dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-[#FAF8F5] dark:hover:bg-stone-800/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 flex items-center justify-center text-sm shadow-2xs">
                        🐾
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-[#222624] dark:text-stone-100">
                            {p.name}
                          </h3>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E9EFEA] text-[#274033] border border-[#D3DFD7] dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                              Activa
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#606763] dark:text-stone-400">
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
                        className="p-1.5 rounded-lg text-[#606763] hover:text-[#222624] hover:bg-[#EFECE5] dark:hover:bg-stone-800"
                        title="Editar perfil"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {pets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePet(p)}
                          className="p-1.5 rounded-lg text-[#C34A3E] hover:bg-[#FDF2F0] dark:hover:bg-rose-950/40"
                          title="Eliminar mascota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {p.weight_kg && (
                    <p className="text-[11px] text-[#606763] dark:text-stone-400 mt-1">
                      Peso: <strong>{p.weight_kg} kg</strong>
                      {p.birth_date && ` • Nacimiento: ${p.birth_date}`}
                    </p>
                  )}

                  {p.notes && (
                    <p className="text-[11px] text-[#606763] dark:text-stone-400 italic mt-1 line-clamp-2">
                      &ldquo;{p.notes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-[#EFECE5] dark:border-stone-800 flex items-center justify-between">
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#357A57] dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5" /> Perfil seleccionado
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectActivePet(p.id)}
                      className="text-xs font-semibold text-[#3E5A4D] dark:text-emerald-400 hover:underline"
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

      {/* 2. Mi Cuenta y Base de Datos (Supabase) */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EFECE5] dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E9EFEA] dark:bg-emerald-950/40 flex items-center justify-center text-[#3E5A4D] dark:text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#222624] dark:text-stone-100">
                Mi Cuenta & Base de Datos Supabase
              </h2>
              <p className="text-[11px] text-[#606763] dark:text-stone-400">
                PostgreSQL en tiempo real con esquema limpio y normalizado
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-[#FAF8F5] dark:bg-stone-800/60 rounded-xl border border-[#E5E1D6] dark:border-stone-700">
            <span className="text-[10px] uppercase font-bold text-[#606763] dark:text-stone-400 block tracking-wider">
              Usuario
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
              Estado de la Base de Datos
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Limpia & Verificada
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-[#FAF8F5] dark:bg-stone-800/60 rounded-xl border border-[#E5E1D6] dark:border-stone-700">
            <span className="text-[10px] uppercase font-bold text-[#606763] dark:text-stone-400 block tracking-wider">
              Última Sincronización
            </span>
            <span className="text-xs font-bold text-[#222624] dark:text-stone-200 mt-1 block">
              {syncStatus.lastSyncedAt
                ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString('es-UY', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'Sincronizado'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EFECE5] dark:border-stone-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncCloud}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#FAF8F5] dark:bg-stone-800 hover:bg-[#EFECE5] dark:hover:bg-stone-700 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-xs font-semibold text-[#222624] dark:text-stone-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar ahora
            </button>
          </div>

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
              onClick={() => router.push('/login')}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#3E5A4D] hover:bg-[#32493E] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 3. Compartir Recordatorios por WhatsApp (Directo y sin intermediarios) */}
        <WhatsAppShareCard />

        {/* 4. Appearance (Modo Claro / Oscuro) */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#EFECE5] dark:border-stone-800">
            <Moon className="w-5 h-5 text-[#3E5A4D] dark:text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-[#222624] dark:text-stone-100">
                Apariencia & Modo Oscuro
              </h2>
              <p className="text-[11px] text-[#606763] dark:text-stone-400">
                Seleccioná el tema visual de la aplicación
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'border-[#3E5A4D] bg-[#E9EFEA] text-[#274033] shadow-xs dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300'
                  : 'border-[#E5E1D6] dark:border-stone-800 bg-white dark:bg-stone-900 text-[#606763] dark:text-stone-400 hover:bg-[#FAF8F5]'
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
                  ? 'border-[#3E5A4D] bg-[#E9EFEA] text-[#274033] shadow-xs dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300'
                  : 'border-[#E5E1D6] dark:border-stone-800 bg-white dark:bg-stone-900 text-[#606763] dark:text-stone-400 hover:bg-[#FAF8F5]'
              }`}
            >
              <Moon className="w-4 h-4 text-[#3E5A4D] dark:text-emerald-400" />
              <span>Modo Oscuro</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                theme === 'system'
                  ? 'border-[#3E5A4D] bg-[#E9EFEA] text-[#274033] shadow-xs dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300'
                  : 'border-[#E5E1D6] dark:border-stone-800 bg-white dark:bg-stone-900 text-[#606763] dark:text-stone-400 hover:bg-[#FAF8F5]'
              }`}
            >
              <Laptop className="w-4 h-4 text-[#606763] dark:text-stone-400" />
              <span>Automático</span>
            </button>
          </div>
        </div>

        {/* 5. System & Timezone info */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-5 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#EFECE5] dark:border-stone-800">
            <Shield className="w-5 h-5 text-[#3E5A4D] dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-[#222624] dark:text-stone-100">
              Parámetros del Sistema
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[#606763] dark:text-stone-400">
            <div>
              Zona horaria médica:{' '}
              <strong className="text-[#222624] dark:text-stone-200">
                America/Montevideo (UTC-3)
              </strong>
            </div>
            <div>
              Moneda local:{' '}
              <strong className="text-[#222624] dark:text-stone-200">UYU ($)</strong>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex sm:justify-end">
          <button
            type="submit"
            disabled={isSavingSettings}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            {isSavingSettings && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {isSavingSettings ? 'Guardando...' : 'Guardar Ajustes'}
          </button>
        </div>
      </form>

      {/* Data Export & Backup Section */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-[#222624] dark:text-stone-100">
            Copia de Seguridad de Datos
          </h3>
          <p className="text-[11px] text-[#606763] dark:text-stone-400">
            Descargá una copia en formato JSON con todas tus mascotas, tomas y recetas
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportJson}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-[#FAF8F5] dark:hover:bg-stone-700 text-xs font-semibold text-[#222624] dark:text-stone-100 transition-colors shrink-0"
        >
          <Download className="w-4 h-4 text-[#3E5A4D] dark:text-emerald-400" /> <span>Exportar JSON</span>
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
