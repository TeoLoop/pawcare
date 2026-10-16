// src/lib/supabase/sync-service.ts
import { createClient, isLiveSupabaseConfigured } from './client';
import { SupabaseCloudRepository } from './cloud-repository';
import { SupabaseAuthService } from './auth-service';
import { KiraRepository } from '@/lib/storage/repository';

export interface SyncStatus {
  isConfigured: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  userName: string | null;
  lastSyncedAt: string | null;
  syncing: boolean;
  error: string | null;
}

const SESSION_CACHE_KEY = 'pawcare_cached_session';

interface CachedSession {
  userEmail: string | null;
  userName: string | null;
  isAuthenticated: boolean;
}

const getInitialSession = (): CachedSession => {
  if (typeof window === 'undefined') {
    return { userEmail: null, userName: null, isAuthenticated: false };
  }
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.isAuthenticated === 'boolean') {
        return parsed;
      }
    }
    // Direct check of Supabase auth tokens in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const val = localStorage.getItem(key);
        if (val && val.includes('access_token')) {
          return { userEmail: null, userName: null, isAuthenticated: true };
        }
      }
    }
  } catch {
    // ignore
  }
  return { userEmail: null, userName: null, isAuthenticated: false };
};

const initialSession = getInitialSession();

const syncStatusState: SyncStatus = {
  isConfigured: false,
  isAuthenticated: initialSession.isAuthenticated,
  userEmail: initialSession.userEmail,
  userName: initialSession.userName,
  lastSyncedAt: null,
  syncing: false,
  error: null,
};

export class CloudSyncService {
  private static initPromise: Promise<void> | null = null;
  private static activeSyncPromise: Promise<{ success: boolean; error?: string }> | null = null;
  private static lastSyncTimestamp = 0;

  static getStatus(): SyncStatus {
    const configured = isLiveSupabaseConfigured();
    return {
      ...syncStatusState,
      isConfigured: configured,
    };
  }

  private static async resolveUserName(user: { id: string; user_metadata?: Record<string, unknown> }): Promise<string | null> {
    let alias = (user.user_metadata?.username as string) || (user.user_metadata?.full_name as string) || null;
    try {
      const supabase = createClient();
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (profile?.full_name?.trim()) {
        alias = profile.full_name.trim();
      }
    } catch {
      // fallback to metadata
    }
    return alias;
  }

  /**
   * Initializes sync listener and runs first sync if user is authenticated.
   */
  static async init(): Promise<void> {
    if (!isLiveSupabaseConfigured()) {
      syncStatusState.isConfigured = false;
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      syncStatusState.isConfigured = true;

      try {
        const user = await SupabaseAuthService.getUser();
        if (user) {
          syncStatusState.isAuthenticated = true;
          syncStatusState.userEmail = user.email || 'Usuario';
          syncStatusState.userName = await this.resolveUserName(user);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
                userEmail: syncStatusState.userEmail,
                userName: syncStatusState.userName,
                isAuthenticated: true,
              }));
            } catch {}
            window.dispatchEvent(new CustomEvent('pawcare_auth_changed'));
          }
          // Fetch data in parallel in the background without blocking init
          this.syncFromCloud().catch(console.warn);
        } else {
          syncStatusState.isAuthenticated = false;
          syncStatusState.userEmail = null;
          syncStatusState.userName = null;
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(SESSION_CACHE_KEY);
            } catch {}
            window.dispatchEvent(new CustomEvent('pawcare_auth_changed'));
          }
        }
      } catch (err: unknown) {
        console.warn('[CloudSync] Init error:', err);
      }
    })();

    return this.initPromise;
  }

  /**
   * Pulls all records from Supabase cloud and updates in-memory repository.
   * Runs queries in parallel for instant sub-second synchronization.
   */
  static async syncFromCloud(force = false): Promise<{ success: boolean; error?: string }> {
    if (!isLiveSupabaseConfigured()) {
      return { success: false, error: 'Supabase no está configurado.' };
    }

    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    const now = Date.now();
    if (!force && now - this.lastSyncTimestamp < 3000) {
      return { success: true };
    }

    this.activeSyncPromise = (async () => {
      syncStatusState.syncing = true;
      syncStatusState.error = null;

      try {
        const user = await SupabaseAuthService.getUser();
        if (!user) {
          syncStatusState.syncing = false;
          syncStatusState.isAuthenticated = false;
          syncStatusState.userName = null;
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(SESSION_CACHE_KEY);
            } catch {}
            window.dispatchEvent(new CustomEvent('pawcare_auth_changed'));
          }
          return { success: false, error: 'Iniciá sesión en Supabase para sincronizar con la nube.' };
        }

        syncStatusState.isAuthenticated = true;
        syncStatusState.userEmail = user.email || 'Usuario';
        syncStatusState.userName = await this.resolveUserName(user);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
              userEmail: syncStatusState.userEmail,
              userName: syncStatusState.userName,
              isAuthenticated: true,
            }));
          } catch {}
          window.dispatchEvent(new CustomEvent('pawcare_auth_changed'));
        }

        // Parallel fetch for all primary tables (9x faster than sequential await)
        const [
          cloudPets,
          cloudMeds,
          cloudDoses,
          cloudLogs,
          cloudSymptoms,
          cloudVisits,
          cloudDocs,
          cloudSettings,
        ] = await Promise.all([
          SupabaseCloudRepository.getPets(),
          SupabaseCloudRepository.getMedications(),
          SupabaseCloudRepository.getScheduledDoses(),
          SupabaseCloudRepository.getDoseLogs(),
          SupabaseCloudRepository.getSymptomLogs(),
          SupabaseCloudRepository.getVetVisits(),
          SupabaseCloudRepository.getMedicalDocuments(),
          SupabaseCloudRepository.getUserSettings(),
        ]);

        if (cloudPets !== null) {
          if (cloudPets.length > 0) {
            KiraRepository.setPetsFromCloud(cloudPets);
          } else {
            const localPets = KiraRepository.getPets();
            if (localPets.length > 0) {
              console.log('[CloudSync] Migrando mascotas locales a Supabase...');
              await this.uploadLocalDataToCloud();
            } else {
              KiraRepository.setPetsFromCloud([]);
            }
          }
        }

        if (cloudMeds !== null) KiraRepository.setMedicationsFromCloud(cloudMeds);
        if (cloudDoses !== null) KiraRepository.setScheduledDosesFromCloud(cloudDoses);
        if (cloudLogs !== null) KiraRepository.setDoseLogsFromCloud(cloudLogs);
        if (cloudSymptoms !== null) KiraRepository.setSymptomsFromCloud(cloudSymptoms);
        if (cloudVisits !== null) KiraRepository.setVetVisitsFromCloud(cloudVisits);
        if (cloudDocs !== null) KiraRepository.setDocumentsFromCloud(cloudDocs);
        if (cloudSettings) KiraRepository.setUserSettingsFromCloud(cloudSettings);

        // 9. Fetch weight logs (only unique pet IDs)
        const uniquePetIds = Array.from(
          new Set(KiraRepository.getPets().map((p) => p.id).filter(Boolean))
        );
        for (const petId of uniquePetIds) {
          const cloudWeights = await SupabaseCloudRepository.getWeightLogs(petId);
          if (cloudWeights && cloudWeights.length > 0) {
            KiraRepository.setWeightLogsFromCloud(cloudWeights, petId);
          }
        }

        syncStatusState.lastSyncedAt = new Date().toISOString();
        syncStatusState.syncing = false;
        this.lastSyncTimestamp = Date.now();

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pawcare_synced'));
        }

        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido al sincronizar.';
        syncStatusState.error = msg;
        syncStatusState.syncing = false;
        return { success: false, error: msg };
      } finally {
        this.activeSyncPromise = null;
      }
    })();

    return this.activeSyncPromise;
  }

  /**
   * Uploads current local database state to Supabase cloud (for initial seeding/migration).
   */
  static async uploadLocalDataToCloud(): Promise<{ success: boolean; count: number; error?: string }> {
    if (!isLiveSupabaseConfigured()) {
      return { success: false, count: 0, error: 'Supabase no está configurado.' };
    }

    try {
      const user = await SupabaseAuthService.getUser();
      if (!user) {
        return { success: false, count: 0, error: 'Iniciá sesión para subir datos a la nube.' };
      }

      let count = 0;
      const pets = KiraRepository.getPets();
      for (const pet of pets) {
        await SupabaseCloudRepository.addPet({
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          birth_date: pet.birth_date,
          weight_kg: pet.weight_kg,
          photo_url: pet.photo_url,
          notes: pet.notes,
        });
        count++;
      }

      const meds = KiraRepository.getMedications();
      for (const med of meds) {
        await SupabaseCloudRepository.addMedication({
          pet_id: med.pet_id,
          name: med.name,
          active_substance: med.active_substance,
          presentation: med.presentation,
          dose_amount: med.dose_amount,
          dose_unit: med.dose_unit,
          instructions: med.instructions,
          notes: med.notes,
          is_active: med.is_active,
          track_inventory: med.track_inventory,
          current_stock: med.current_stock,
          low_stock_threshold: med.low_stock_threshold,
        });
        count++;
      }

      const settings = KiraRepository.getSettings();
      if (settings) {
        await SupabaseCloudRepository.updateUserSettings(settings);
      }

      return { success: true, count };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir datos a Supabase.';
      return { success: false, count: 0, error: msg };
    }
  }
}
