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

const syncStatusState: SyncStatus = {
  isConfigured: false,
  isAuthenticated: false,
  userEmail: null,
  userName: null,
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
          await this.syncFromCloud();
        } else {
          syncStatusState.isAuthenticated = false;
          syncStatusState.userEmail = null;
          syncStatusState.userName = null;
        }
      } catch (err: unknown) {
        console.warn('[CloudSync] Init error:', err);
      }
    })();

    return this.initPromise;
  }

  /**
   * Pulls all records from Supabase cloud and updates in-memory repository.
   * Debounced and concurrency-locked to avoid redundant network spikes.
   */
  static async syncFromCloud(force = false): Promise<{ success: boolean; error?: string }> {
    if (!isLiveSupabaseConfigured()) {
      return { success: false, error: 'Supabase no está configurado.' };
    }

    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    const now = Date.now();
    if (!force && now - this.lastSyncTimestamp < 5000) {
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
          return { success: false, error: 'Iniciá sesión en Supabase para sincronizar con la nube.' };
        }

      syncStatusState.isAuthenticated = true;
      syncStatusState.userEmail = user.email || 'Usuario';
      syncStatusState.userName = await this.resolveUserName(user);

      // 1. Fetch pets from cloud
      const cloudPets = await SupabaseCloudRepository.getPets();
      KiraRepository.setPetsFromCloud(cloudPets || []);

      // 2. Fetch medications from cloud
      const cloudMeds = await SupabaseCloudRepository.getMedications();
      KiraRepository.setMedicationsFromCloud(cloudMeds || []);

      // 3. Fetch scheduled doses
      const cloudDoses = await SupabaseCloudRepository.getScheduledDoses();
      KiraRepository.setScheduledDosesFromCloud(cloudDoses || []);

      // 4. Fetch dose logs
      const cloudLogs = await SupabaseCloudRepository.getDoseLogs();
      KiraRepository.setDoseLogsFromCloud(cloudLogs || []);

      // 5. Fetch symptoms
      const cloudSymptoms = await SupabaseCloudRepository.getSymptomLogs();
      KiraRepository.setSymptomsFromCloud(cloudSymptoms || []);

      // 6. Fetch vet visits
      const cloudVisits = await SupabaseCloudRepository.getVetVisits();
      KiraRepository.setVetVisitsFromCloud(cloudVisits || []);

      // 7. Fetch medical documents
      const cloudDocs = await SupabaseCloudRepository.getMedicalDocuments();
      KiraRepository.setDocumentsFromCloud(cloudDocs || []);

      // 8. Fetch user settings
      const cloudSettings = await SupabaseCloudRepository.getUserSettings();
      if (cloudSettings) {
        KiraRepository.setUserSettingsFromCloud(cloudSettings);
      }

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
