// src/lib/storage/repository.ts
import {
  Pet,
  Medication,
  MedicationSchedule,
  ScheduledDose,
  DoseLog,
} from '@/types/medication';
import { SymptomLog } from '@/types/health';
import { VetVisit, MedicalDocument } from '@/types/veterinary';
import { UserSettings } from '@/types/settings';
import { NotificationJob, NotificationAttempt } from '@/types/whatsapp';
import { StockForecast, InventoryEvent } from '@/types/inventory';
import {
  computeDoseStatus,
  generateScheduleDoses,
  getLocalDateString,
} from '@/lib/date-utils';
import {
  INITIAL_PET,
  INITIAL_PETS,
  INITIAL_SETTINGS,
  INITIAL_MEDICATIONS,
  buildInitialScheduledDoses,
  INITIAL_SYMPTOMS,
  INITIAL_VET_VISITS,
  INITIAL_DOCUMENTS,
} from './mock-data';
import { isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { SupabaseCloudRepository } from '@/lib/supabase/cloud-repository';

const STORAGE_KEYS = {
  PETS: 'pawcare_pets',
  ACTIVE_PET_ID: 'pawcare_active_pet_id',
  SETTINGS: 'pawcare_settings',
  MEDICATIONS: 'pawcare_medications',
  DOSES: 'pawcare_scheduled_doses',
  DOSE_LOGS: 'pawcare_dose_logs',
  SYMPTOMS: 'pawcare_symptoms',
  INVENTORY_EVENTS: 'pawcare_inventory_events',
  VET_VISITS: 'pawcare_vet_visits',
  DOCUMENTS: 'pawcare_documents',
  NOTIFICATIONS: 'pawcare_notifications',
  NOTIFICATION_ATTEMPTS: 'pawcare_notification_attempts',
};

// Memory store fallback for SSR
class AppState {
  pets: Pet[] = [...INITIAL_PETS];
  activePetId: string = INITIAL_PET.id;
  settings: UserSettings = { ...INITIAL_SETTINGS };
  medications: Medication[] = [...INITIAL_MEDICATIONS];
  scheduledDoses: ScheduledDose[] = buildInitialScheduledDoses();
  doseLogs: DoseLog[] = [];
  symptoms: SymptomLog[] = [...INITIAL_SYMPTOMS];
  inventoryEvents: InventoryEvent[] = [];
  vetVisits: VetVisit[] = [...INITIAL_VET_VISITS];
  documents: MedicalDocument[] = [...INITIAL_DOCUMENTS];
  notifications: NotificationJob[] = [];
  notificationAttempts: NotificationAttempt[] = [];
  initialized = false;
}

const memoryState = new AppState();

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.warn(`Error reading from localStorage key ${key}:`, err);
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Error writing to localStorage key ${key}:`, err);
  }
}

export class KiraRepository {
  private static init() {
    if (isClient() && !memoryState.initialized) {
      memoryState.pets = loadFromStorage(STORAGE_KEYS.PETS, memoryState.pets);
      // Migration from single-pet key if found
      const legacyPet = loadFromStorage<Pet | null>('kira_pet', null);
      if (legacyPet && !memoryState.pets.some((p) => p.id === legacyPet.id)) {
        memoryState.pets.push(legacyPet);
      }
      memoryState.activePetId = loadFromStorage(
        STORAGE_KEYS.ACTIVE_PET_ID,
        memoryState.pets[0]?.id || INITIAL_PET.id
      );

      memoryState.settings = loadFromStorage(STORAGE_KEYS.SETTINGS, memoryState.settings);
      memoryState.medications = loadFromStorage(STORAGE_KEYS.MEDICATIONS, memoryState.medications);
      memoryState.scheduledDoses = loadFromStorage(STORAGE_KEYS.DOSES, memoryState.scheduledDoses);
      memoryState.doseLogs = loadFromStorage(STORAGE_KEYS.DOSE_LOGS, memoryState.doseLogs);
      memoryState.symptoms = loadFromStorage(STORAGE_KEYS.SYMPTOMS, memoryState.symptoms);
      memoryState.inventoryEvents = loadFromStorage(STORAGE_KEYS.INVENTORY_EVENTS, memoryState.inventoryEvents);
      memoryState.vetVisits = loadFromStorage(STORAGE_KEYS.VET_VISITS, memoryState.vetVisits);
      memoryState.documents = loadFromStorage(STORAGE_KEYS.DOCUMENTS, memoryState.documents);
      memoryState.notifications = loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, memoryState.notifications);
      memoryState.notificationAttempts = loadFromStorage(STORAGE_KEYS.NOTIFICATION_ATTEMPTS, memoryState.notificationAttempts);
      memoryState.initialized = true;
    }
  }

  // --- MULTI-PET MANAGEMENT ---
  static getPets(): Pet[] {
    this.init();
    return memoryState.pets;
  }

  static getActivePetId(): string {
    this.init();
    return memoryState.activePetId;
  }

  static getActivePet(): Pet {
    this.init();
    const found = memoryState.pets.find((p) => p.id === memoryState.activePetId);
    return found || memoryState.pets[0] || { ...INITIAL_PET };
  }

  static getPet(id?: string): Pet {
    this.init();
    if (id) {
      const found = memoryState.pets.find((p) => p.id === id);
      if (found) return found;
    }
    return this.getActivePet();
  }

  static setActivePetId(petId: string): void {
    this.init();
    const exists = memoryState.pets.some((p) => p.id === petId);
    if (exists) {
      memoryState.activePetId = petId;
      saveToStorage(STORAGE_KEYS.ACTIVE_PET_ID, petId);
      if (isClient()) {
        window.dispatchEvent(new CustomEvent('pawcare_pet_changed', { detail: { petId } }));
      }
    }
  }

  static addPet(data: Omit<Pet, 'id' | 'created_at' | 'updated_at'>): Pet {
    this.init();
    const now = new Date().toISOString();
    const newPet: Pet = {
      ...data,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    };
    memoryState.pets.push(newPet);
    saveToStorage(STORAGE_KEYS.PETS, memoryState.pets);
    this.setActivePetId(newPet.id);

    if (isClient() && isLiveSupabaseConfigured()) {
      SupabaseCloudRepository.addPet(newPet).catch((err) =>
        console.warn('[CloudSync] addPet cloud error:', err)
      );
    }

    return newPet;
  }

  static updatePet(petIdOrData: string | Partial<Pet>, data?: Partial<Pet>): Pet {
    this.init();
    let targetId: string;
    let updates: Partial<Pet>;

    if (typeof petIdOrData === 'string') {
      targetId = petIdOrData;
      updates = data || {};
    } else {
      targetId = memoryState.activePetId;
      updates = petIdOrData;
    }

    const idx = memoryState.pets.findIndex((p) => p.id === targetId);
    if (idx !== -1) {
      memoryState.pets[idx] = {
        ...memoryState.pets[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      saveToStorage(STORAGE_KEYS.PETS, memoryState.pets);

      if (isClient() && isLiveSupabaseConfigured()) {
        SupabaseCloudRepository.updatePet(targetId, updates).catch((err) =>
          console.warn('[CloudSync] updatePet cloud error:', err)
        );
      }

      if (isClient()) {
        window.dispatchEvent(new CustomEvent('pawcare_pet_changed', { detail: { petId: targetId } }));
      }
      return memoryState.pets[idx];
    }
    return this.getActivePet();
  }

  static deletePet(petId: string): boolean {
    this.init();
    if (memoryState.pets.length <= 1) {
      return false; // Preserve at least one pet
    }
    memoryState.pets = memoryState.pets.filter((p) => p.id !== petId);
    if (memoryState.activePetId === petId) {
      memoryState.activePetId = memoryState.pets[0].id;
      saveToStorage(STORAGE_KEYS.ACTIVE_PET_ID, memoryState.activePetId);
    }
    saveToStorage(STORAGE_KEYS.PETS, memoryState.pets);

    if (isClient() && isLiveSupabaseConfigured()) {
      SupabaseCloudRepository.deletePet(petId).catch((err) =>
        console.warn('[CloudSync] deletePet cloud error:', err)
      );
    }

    if (isClient()) {
      window.dispatchEvent(new CustomEvent('pawcare_pet_changed', { detail: { petId: memoryState.activePetId } }));
    }
    return true;
  }

  // --- SETTINGS ---
  static getSettings(): UserSettings {
    this.init();
    return memoryState.settings;
  }

  static updateSettings(data: Partial<UserSettings>): UserSettings {
    this.init();
    memoryState.settings = {
      ...memoryState.settings,
      ...data,
      updated_at: new Date().toISOString(),
    };
    saveToStorage(STORAGE_KEYS.SETTINGS, memoryState.settings);

    if (isClient() && isLiveSupabaseConfigured()) {
      SupabaseCloudRepository.updateUserSettings(memoryState.settings).catch((err) =>
        console.warn('[CloudSync] updateUserSettings cloud error:', err)
      );
    }

    return memoryState.settings;
  }

  // --- MEDICATIONS ---
  static getMedications(petId?: string): Medication[] {
    this.init();
    const targetPetId = petId || memoryState.activePetId;
    return targetPetId === 'all'
      ? memoryState.medications
      : memoryState.medications.filter((m) => m.pet_id === targetPetId);
  }

  static getMedicationById(id: string): Medication | undefined {
    this.init();
    return memoryState.medications.find((m) => m.id === id);
  }

  static saveMedication(
    data: Omit<Medication, 'id' | 'created_at' | 'updated_at'> & { id?: string },
    scheduleData?: Omit<MedicationSchedule, 'id' | 'medication_id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Medication {
    this.init();
    const now = new Date().toISOString();
    let med: Medication;

    const assignedPetId = data.pet_id || memoryState.activePetId;

    if (data.id) {
      // Update existing
      const existingIdx = memoryState.medications.findIndex((m) => m.id === data.id);
      if (existingIdx === -1) throw new Error('Medicación no encontrada');

      const existing = memoryState.medications[existingIdx];
      med = {
        ...existing,
        ...data,
        pet_id: assignedPetId,
        id: data.id,
        updated_at: now,
      };

      if (scheduleData) {
        med.schedule = {
          id: existing.schedule?.id || crypto.randomUUID(),
          medication_id: med.id,
          frequency_type: scheduleData.frequency_type,
          times_of_day: scheduleData.times_of_day,
          days_of_week: scheduleData.days_of_week,
          start_date: scheduleData.start_date,
          end_date: scheduleData.end_date,
          is_active: scheduleData.is_active ?? true,
          created_at: existing.schedule?.created_at || now,
          updated_at: now,
        };
      }

      memoryState.medications[existingIdx] = med;
    } else {
      // Create new
      const id = data.id || crypto.randomUUID();
      med = {
        ...data,
        pet_id: assignedPetId,
        id,
        created_at: now,
        updated_at: now,
      };

      if (scheduleData) {
        med.schedule = {
          id: crypto.randomUUID(),
          medication_id: id,
          frequency_type: scheduleData.frequency_type,
          times_of_day: scheduleData.times_of_day,
          days_of_week: scheduleData.days_of_week,
          start_date: scheduleData.start_date,
          end_date: scheduleData.end_date,
          is_active: scheduleData.is_active ?? true,
          created_at: now,
          updated_at: now,
        };
      }

      memoryState.medications.push(med);
    }

    // Generate upcoming doses for active schedule without overwriting already administered/skipped doses
    if (med.is_active && med.schedule && med.schedule.is_active) {
      this.generateUpcomingDosesForMedication(med);
    }

    saveToStorage(STORAGE_KEYS.MEDICATIONS, memoryState.medications);

    if (isClient() && isLiveSupabaseConfigured()) {
      if (data.id) {
        SupabaseCloudRepository.updateMedication(data.id, med).catch((err) =>
          console.warn('[CloudSync] updateMedication cloud error:', err)
        );
      } else {
        SupabaseCloudRepository.addMedication(med).catch((err) =>
          console.warn('[CloudSync] addMedication cloud error:', err)
        );
      }
    }

    return med;
  }

  static toggleMedicationStatus(id: string, is_active: boolean): Medication {
    this.init();
    const med = this.getMedicationById(id);
    if (!med) throw new Error('Medicación no encontrada');
    med.is_active = is_active;
    med.updated_at = new Date().toISOString();
    if (med.schedule) {
      med.schedule.is_active = is_active;
    }

    if (is_active) {
      this.generateUpcomingDosesForMedication(med);
    } else {
      // Mark future scheduled (non-administered) doses as cancelled
      const todayStr = getLocalDateString();
      memoryState.scheduledDoses = memoryState.scheduledDoses.map((d) => {
        if (d.medication_id === id && d.status === 'scheduled' && d.scheduled_date >= todayStr) {
          return { ...d, status: 'cancelled', updated_at: new Date().toISOString() };
        }
        return d;
      });
      saveToStorage(STORAGE_KEYS.DOSES, memoryState.scheduledDoses);
    }

    saveToStorage(STORAGE_KEYS.MEDICATIONS, memoryState.medications);
    return med;
  }

  static deleteMedication(id: string): void {
    this.init();
    memoryState.medications = memoryState.medications.filter((m) => m.id !== id);
    // Keep past history intact, remove future pending doses
    const todayStr = getLocalDateString();
    memoryState.scheduledDoses = memoryState.scheduledDoses.filter(
      (d) => !(d.medication_id === id && d.status === 'scheduled' && d.scheduled_date >= todayStr)
    );
    saveToStorage(STORAGE_KEYS.MEDICATIONS, memoryState.medications);
    saveToStorage(STORAGE_KEYS.DOSES, memoryState.scheduledDoses);
  }

  private static generateUpcomingDosesForMedication(med: Medication, days: number = 7) {
    if (!med.schedule) return;
    const todayStr = getLocalDateString();
    const generated = generateScheduleDoses(
      {
        frequency_type: med.schedule.frequency_type,
        times_of_day: med.schedule.times_of_day,
        days_of_week: med.schedule.days_of_week,
        start_date: med.schedule.start_date,
        end_date: med.schedule.end_date,
      },
      { previewDays: days, fromDate: todayStr }
    );

    const existingKeySet = new Set(
      memoryState.scheduledDoses
        .filter((d) => d.medication_id === med.id)
        .map((d) => `${d.scheduled_date}_${d.scheduled_time}`)
    );

    const newDoses: ScheduledDose[] = [];
    for (const g of generated) {
      const key = `${g.scheduled_date}_${g.scheduled_time}`;
      if (!existingKeySet.has(key)) {
        newDoses.push({
          id: crypto.randomUUID(),
          pet_id: med.pet_id,
          medication_id: med.id,
          schedule_id: med.schedule.id,
          scheduled_for: g.scheduled_for,
          scheduled_date: g.scheduled_date,
          scheduled_time: g.scheduled_time,
          dose_amount: med.dose_amount,
          dose_unit: med.dose_unit,
          status: 'scheduled',
          confirmation_token: `token-${med.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          token_expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          medication: med,
        });
        existingKeySet.add(key);
      }
    }

    if (newDoses.length > 0) {
      memoryState.scheduledDoses = [...memoryState.scheduledDoses, ...newDoses];
      saveToStorage(STORAGE_KEYS.DOSES, memoryState.scheduledDoses);

      if (isClient() && isLiveSupabaseConfigured()) {
        SupabaseCloudRepository.upsertScheduledDoses(newDoses).catch((err) =>
          console.warn('[CloudSync] upsertScheduledDoses cloud error:', err)
        );
      }
    }
  }

  // --- SCHEDULED DOSES & ACTIONS ---
  static getScheduledDoses(date?: string | 'all', petId?: string): ScheduledDose[] {
    this.init();
    const targetDate = date === undefined ? getLocalDateString() : date;
    const targetPetId = petId || memoryState.activePetId;
    
    const filtered = memoryState.scheduledDoses
      .filter((d) => (targetDate === 'all' || d.scheduled_date === targetDate) && (targetPetId === 'all' || d.pet_id === targetPetId));

    // Deduplicate by medication_id + scheduled_date + scheduled_time, prioritizing 'administered' or 'skipped'
    const uniqueMap = new Map<string, ScheduledDose>();
    for (const d of filtered) {
      const key = `${d.medication_id}_${d.scheduled_date}_${d.scheduled_time}`;
      const existing = uniqueMap.get(key);
      if (!existing || (d.status === 'administered' && existing.status !== 'administered')) {
        uniqueMap.set(key, d);
      }
    }

    return Array.from(uniqueMap.values())
      .map((d) => {
        const med = memoryState.medications.find((m) => m.id === d.medication_id);
        const log = memoryState.doseLogs.find((l) => l.scheduled_dose_id === d.id);
        const computed = computeDoseStatus(d.status, d.scheduled_for);
        return {
          ...d,
          status: computed,
          medication: med,
          log: log,
        };
      })
      .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  }

  static getDoseByConfirmationToken(token: string): ScheduledDose | undefined {
    this.init();
    const dose = memoryState.scheduledDoses.find((d) => d.confirmation_token === token);
    if (!dose) return undefined;
    const med = memoryState.medications.find((m) => m.id === dose.medication_id);
    return {
      ...dose,
      status: computeDoseStatus(dose.status, dose.scheduled_for),
      medication: med,
    };
  }

  /**
   * Records dose administration or skipping.
   * STRICT GUARANTEE: Stock is ONLY deducted when status is 'administered'.
   * Single-use token invalidation prevents re-use of WhatsApp confirmation links.
   */
  static recordDoseAction(input: {
    scheduled_dose_id?: string;
    medication_id: string;
    status: 'administered' | 'skipped';
    administered_at?: string;
    registered_by: 'manual' | 'whatsapp_link' | 'whatsapp_webhook';
    notes?: string;
    reason_skipped?: string;
  }): { doseLog: DoseLog; medication: Medication } {
    this.init();
    const now = new Date().toISOString();
    const med = this.getMedicationById(input.medication_id);
    if (!med) throw new Error('Medicación no encontrada');

    let inventoryDeducted = 0;

    // Deduct stock ONLY on effective administration
    if (input.status === 'administered' && med.track_inventory) {
      inventoryDeducted = med.dose_amount;
      med.current_stock = Math.max(0, Number((med.current_stock - inventoryDeducted).toFixed(2)));
      med.updated_at = now;

      // Log inventory event
      const invEvent: InventoryEvent = {
        id: `inv-${Date.now()}`,
        medication_id: med.id,
        event_type: 'dose_administered',
        quantity_delta: -inventoryDeducted,
        resulting_stock: med.current_stock,
        notes: `Toma registrada (${input.registered_by})`,
        created_at: now,
      };
      memoryState.inventoryEvents.unshift(invEvent);
      saveToStorage(STORAGE_KEYS.INVENTORY_EVENTS, memoryState.inventoryEvents);
      saveToStorage(STORAGE_KEYS.MEDICATIONS, memoryState.medications);
    }

    // Create Dose Log
    const log: DoseLog = {
      id: crypto.randomUUID(),
      scheduled_dose_id: input.scheduled_dose_id,
      pet_id: med.pet_id,
      medication_id: med.id,
      status: input.status,
      scheduled_time: input.scheduled_dose_id
        ? memoryState.scheduledDoses.find((d) => d.id === input.scheduled_dose_id)?.scheduled_for || now
        : now,
      administered_at: input.administered_at || now,
      registered_by: input.registered_by,
      reason_skipped: input.reason_skipped,
      notes: input.notes,
      inventory_deducted: inventoryDeducted,
      created_at: now,
      updated_at: now,
      medication: med,
    };
    memoryState.doseLogs.unshift(log);
    saveToStorage(STORAGE_KEYS.DOSE_LOGS, memoryState.doseLogs);

    // Update scheduled dose if matching
    if (input.scheduled_dose_id) {
      const doseIdx = memoryState.scheduledDoses.findIndex((d) => d.id === input.scheduled_dose_id);
      if (doseIdx !== -1) {
        memoryState.scheduledDoses[doseIdx] = {
          ...memoryState.scheduledDoses[doseIdx],
          status: input.status,
          confirmation_token: undefined,
          token_expires_at: undefined,
          updated_at: now,
        };
        saveToStorage(STORAGE_KEYS.DOSES, memoryState.scheduledDoses);
      }
    }

    if (isClient() && isLiveSupabaseConfigured()) {
      SupabaseCloudRepository.recordDoseLog(log).catch((err) =>
        console.warn('[CloudSync] recordDoseLog cloud error:', err)
      );
      if (input.scheduled_dose_id) {
        SupabaseCloudRepository.updateDoseStatus(input.scheduled_dose_id, input.status).catch((err) =>
          console.warn('[CloudSync] updateDoseStatus cloud error:', err)
        );
      }
    }

    return { doseLog: log, medication: med };
  }

  /**
   * Corrects a previous dose log with full audit trail and adjusts stock if needed.
   */
  static correctDoseLog(
    logId: string,
    newStatus: 'administered' | 'skipped',
    correctionReason: string
  ): DoseLog {
    this.init();
    const logIdx = memoryState.doseLogs.findIndex((l) => l.id === logId);
    if (logIdx === -1) throw new Error('Registro de toma no encontrado');

    const log = memoryState.doseLogs[logIdx];
    const med = this.getMedicationById(log.medication_id);
    const now = new Date().toISOString();

    if (log.status !== newStatus && med && med.track_inventory) {
      if (log.status === 'administered' && newStatus === 'skipped') {
        med.current_stock = Number((med.current_stock + log.inventory_deducted).toFixed(2));
        memoryState.inventoryEvents.unshift({
          id: `inv-${Date.now()}`,
          medication_id: med.id,
          event_type: 'adjustment',
          quantity_delta: log.inventory_deducted,
          resulting_stock: med.current_stock,
          notes: `Corrección de toma: revertido a omitida (${correctionReason})`,
          created_at: now,
        });
        log.inventory_deducted = 0;
      } else if (log.status === 'skipped' && newStatus === 'administered') {
        const deduction = med.dose_amount;
        med.current_stock = Math.max(0, Number((med.current_stock - deduction).toFixed(2)));
        memoryState.inventoryEvents.unshift({
          id: `inv-${Date.now()}`,
          medication_id: med.id,
          event_type: 'adjustment',
          quantity_delta: -deduction,
          resulting_stock: med.current_stock,
          notes: `Corrección de toma: marcada como administrada (${correctionReason})`,
          created_at: now,
        });
        log.inventory_deducted = deduction;
      }
      saveToStorage(STORAGE_KEYS.MEDICATIONS, memoryState.medications);
      saveToStorage(STORAGE_KEYS.INVENTORY_EVENTS, memoryState.inventoryEvents);
    }

    log.status = newStatus;
    log.notes = `${log.notes ? log.notes + ' | ' : ''}Corrección auditada [${now}]: ${correctionReason}`;
    log.updated_at = now;

    if (log.scheduled_dose_id) {
      const doseIdx = memoryState.scheduledDoses.findIndex((d) => d.id === log.scheduled_dose_id);
      if (doseIdx !== -1) {
        memoryState.scheduledDoses[doseIdx].status = newStatus;
        memoryState.scheduledDoses[doseIdx].updated_at = now;
        saveToStorage(STORAGE_KEYS.DOSES, memoryState.scheduledDoses);
      }
    }

    saveToStorage(STORAGE_KEYS.DOSE_LOGS, memoryState.doseLogs);
    return log;
  }

  // --- DOSE HISTORY ---
  static getDoseHistory(filters?: {
    medicationId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    petId?: string;
  }): DoseLog[] {
    this.init();
    const targetPetId = filters?.petId || memoryState.activePetId;
    let logs = [...memoryState.doseLogs];

    if (targetPetId && targetPetId !== 'all') {
      logs = logs.filter((l) => l.pet_id === targetPetId);
    }
    if (filters?.medicationId) {
      logs = logs.filter((l) => l.medication_id === filters.medicationId);
    }
    if (filters?.status && filters.status !== 'all') {
      logs = logs.filter((l) => l.status === filters.status);
    }
    if (filters?.startDate) {
      logs = logs.filter((l) => l.administered_at >= filters.startDate!);
    }
    if (filters?.endDate) {
      logs = logs.filter((l) => l.administered_at <= filters.endDate!);
    }

    return logs.map((l) => ({
      ...l,
      medication: memoryState.medications.find((m) => m.id === l.medication_id),
    }));
  }

  // --- SYMPTOMS & HEALTH ---
  static getSymptomLogs(petId?: string): SymptomLog[] {
    this.init();
    const targetPetId = petId || memoryState.activePetId;
    const list = targetPetId === 'all'
      ? memoryState.symptoms
      : memoryState.symptoms.filter((s) => s.pet_id === targetPetId);
    return [...list].sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  }

  static addSymptomLog(
    data: Omit<SymptomLog, 'id' | 'pet_id' | 'created_at' | 'updated_at'> & { pet_id?: string }
  ): SymptomLog {
    this.init();
    const now = new Date().toISOString();
    const assignedPetId = data.pet_id || memoryState.activePetId;
    const log: SymptomLog = {
      ...data,
      id: crypto.randomUUID(),
      pet_id: assignedPetId,
      created_at: now,
      updated_at: now,
    };
    memoryState.symptoms.unshift(log);
    saveToStorage(STORAGE_KEYS.SYMPTOMS, memoryState.symptoms);

    if (isClient() && isLiveSupabaseConfigured()) {
      SupabaseCloudRepository.addSymptomLog(log).catch((err) =>
        console.warn('[CloudSync] addSymptomLog cloud error:', err)
      );
    }

    return log;
  }

  // --- INVENTORY ---
  static restockMedication(medicationId: string, quantity: number, notes?: string): Medication {
    this.init();
    const med = this.getMedicationById(medicationId);
    if (!med) throw new Error('Medicación no encontrada');

    const now = new Date().toISOString();
    med.current_stock = Number((med.current_stock + quantity).toFixed(2));
    med.updated_at = now;

    const event: InventoryEvent = {
      id: `inv-${Date.now()}`,
      medication_id: med.id,
      event_type: 'restock',
      quantity_delta: quantity,
      resulting_stock: med.current_stock,
      notes: notes || 'Reposición manual de existencias',
      created_at: now,
    };

    memoryState.inventoryEvents.unshift(event);
    saveToStorage(STORAGE_KEYS.INVENTORY_EVENTS, memoryState.inventoryEvents);
    saveToStorage(STORAGE_KEYS.MEDICATIONS, memoryState.medications);
    return med;
  }

  static getStockForecasts(petId?: string): StockForecast[] {
    this.init();
    const targetPetId = petId || memoryState.activePetId;
    return memoryState.medications
      .filter((m) => m.track_inventory && m.is_active && (targetPetId === 'all' || m.pet_id === targetPetId))
      .map((med) => {
        let dailyConsumption = 0;
        if (med.schedule && med.schedule.times_of_day.length > 0) {
          if (med.schedule.frequency_type === 'daily') {
            dailyConsumption = med.schedule.times_of_day.length * med.dose_amount;
          } else if (med.schedule.frequency_type === 'specific_days' && med.schedule.days_of_week) {
            const daysPerWeek = med.schedule.days_of_week.length;
            dailyConsumption = (daysPerWeek / 7) * med.schedule.times_of_day.length * med.dose_amount;
          }
        }

        const daysRemaining = dailyConsumption > 0 ? Math.floor(med.current_stock / dailyConsumption) : null;
        let estimatedDepletionDate: string | null = null;
        if (daysRemaining !== null) {
          const d = new Date();
          d.setDate(d.getDate() + daysRemaining);
          estimatedDepletionDate = d.toISOString().split('T')[0];
        }

        return {
          medicationId: med.id,
          medicationName: med.name,
          currentStock: med.current_stock,
          unit: med.dose_unit,
          dailyConsumption: Number(dailyConsumption.toFixed(2)),
          daysRemaining,
          estimatedDepletionDate,
          isLowStock: med.current_stock <= med.low_stock_threshold,
          needsRestockWarning: daysRemaining !== null && daysRemaining <= 7,
        };
      });
  }

  // --- VET VISITS & DOCUMENTS ---
  static getVetVisits(petId?: string): VetVisit[] {
    this.init();
    const targetPetId = petId || memoryState.activePetId;
    const list = targetPetId === 'all'
      ? memoryState.vetVisits
      : memoryState.vetVisits.filter((v) => v.pet_id === targetPetId);
    return [...list].sort((a, b) => b.visit_date.localeCompare(a.visit_date));
  }

  static addVetVisit(
    data: Omit<VetVisit, 'id' | 'pet_id' | 'created_at' | 'updated_at'> & { pet_id?: string }
  ): VetVisit {
    this.init();
    const now = new Date().toISOString();
    const assignedPetId = data.pet_id || memoryState.activePetId;
    const visit: VetVisit = {
      ...data,
      id: crypto.randomUUID(),
      pet_id: assignedPetId,
      created_at: now,
      updated_at: now,
    };
    memoryState.vetVisits.unshift(visit);
    saveToStorage(STORAGE_KEYS.VET_VISITS, memoryState.vetVisits);

    if (isClient() && isLiveSupabaseConfigured()) {
      SupabaseCloudRepository.addVetVisit(visit).catch((err) =>
        console.warn('[CloudSync] addVetVisit cloud error:', err)
      );
    }

    return visit;
  }

  static deleteVetVisit(id: string): void {
    this.init();
    memoryState.vetVisits = memoryState.vetVisits.filter((v) => v.id !== id);
    saveToStorage(STORAGE_KEYS.VET_VISITS, memoryState.vetVisits);
  }

  static getDocuments(petId?: string): MedicalDocument[] {
    this.init();
    const targetPetId = petId || memoryState.activePetId;
    const list = targetPetId === 'all'
      ? memoryState.documents
      : memoryState.documents.filter((d) => d.pet_id === targetPetId);
    return [...list].sort((a, b) => b.document_date.localeCompare(a.document_date));
  }

  static addDocument(
    data: Omit<MedicalDocument, 'id' | 'pet_id' | 'created_at'> & { pet_id?: string }
  ): MedicalDocument {
    this.init();
    const now = new Date().toISOString();
    const assignedPetId = data.pet_id || memoryState.activePetId;
    const doc: MedicalDocument = {
      ...data,
      id: crypto.randomUUID(),
      pet_id: assignedPetId,
      created_at: now,
    };
    memoryState.documents.unshift(doc);
    saveToStorage(STORAGE_KEYS.DOCUMENTS, memoryState.documents);

    if (isClient() && isLiveSupabaseConfigured()) {
      SupabaseCloudRepository.addMedicalDocument(doc).catch((err) =>
        console.warn('[CloudSync] addMedicalDocument cloud error:', err)
      );
    }

    return doc;
  }

  static deleteDocument(id: string): void {
    this.init();
    memoryState.documents = memoryState.documents.filter((d) => d.id !== id);
    saveToStorage(STORAGE_KEYS.DOCUMENTS, memoryState.documents);
  }

  // --- NOTIFICATIONS & AUDIT ---
  static getNotificationJobs(): NotificationJob[] {
    this.init();
    return [...memoryState.notifications].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  static addNotificationJob(job: NotificationJob): void {
    this.init();
    memoryState.notifications.unshift(job);
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, memoryState.notifications);
  }

  static updateNotificationJob(id: string, updates: Partial<NotificationJob>): void {
    this.init();
    const idx = memoryState.notifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      memoryState.notifications[idx] = {
        ...memoryState.notifications[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, memoryState.notifications);
    }
  }

  static addNotificationAttempt(attempt: NotificationAttempt): void {
    this.init();
    memoryState.notificationAttempts.unshift(attempt);
    saveToStorage(STORAGE_KEYS.NOTIFICATION_ATTEMPTS, memoryState.notificationAttempts);
  }

  static getNotificationAttempts(): NotificationAttempt[] {
    this.init();
    return [...memoryState.notificationAttempts].sort((a, b) => b.attempted_at.localeCompare(a.attempted_at));
  }

  // --- CLOUD HYDRATION SETTERS ---
  static setPetsFromCloud(pets: Pet[]): void {
    this.init();
    memoryState.pets = pets || [];
    if (pets && pets.length > 0) {
      if (!pets.some((p) => p.id === memoryState.activePetId)) {
        memoryState.activePetId = pets[0].id;
        saveToStorage(STORAGE_KEYS.ACTIVE_PET_ID, memoryState.activePetId);
      }
    } else {
      memoryState.activePetId = '';
      saveToStorage(STORAGE_KEYS.ACTIVE_PET_ID, '');
    }
    saveToStorage(STORAGE_KEYS.PETS, memoryState.pets);
    if (isClient()) {
      window.dispatchEvent(new CustomEvent('pawcare_pet_changed', { detail: { petId: memoryState.activePetId } }));
    }
  }

  static setMedicationsFromCloud(medications: Medication[]): void {
    this.init();
    memoryState.medications = medications || [];
    saveToStorage(STORAGE_KEYS.MEDICATIONS, memoryState.medications);
  }

  static setScheduledDosesFromCloud(doses: ScheduledDose[]): void {
    this.init();
    
    // Deduplicate doses by medication_id + scheduled_date + scheduled_time, prioritizing 'administered'
    const doseMap = new Map<string, ScheduledDose>();
    for (const d of doses || []) {
      const key = `${d.medication_id}_${d.scheduled_date}_${d.scheduled_time}`;
      const existing = doseMap.get(key);
      if (!existing || (d.status === 'administered' && existing.status !== 'administered')) {
        doseMap.set(key, d);
      }
    }

    memoryState.scheduledDoses = Array.from(doseMap.values());
    saveToStorage(STORAGE_KEYS.DOSES, memoryState.scheduledDoses);
  }

  static setDoseLogsFromCloud(logs: DoseLog[]): void {
    this.init();
    memoryState.doseLogs = logs || [];
    saveToStorage(STORAGE_KEYS.DOSE_LOGS, memoryState.doseLogs);
  }

  static setSymptomsFromCloud(symptoms: SymptomLog[]): void {
    this.init();
    memoryState.symptoms = symptoms || [];
    saveToStorage(STORAGE_KEYS.SYMPTOMS, memoryState.symptoms);
  }

  static setVetVisitsFromCloud(visits: VetVisit[]): void {
    this.init();
    memoryState.vetVisits = visits || [];
    saveToStorage(STORAGE_KEYS.VET_VISITS, memoryState.vetVisits);
  }

  static setDocumentsFromCloud(docs: MedicalDocument[]): void {
    this.init();
    memoryState.documents = docs || [];
    saveToStorage(STORAGE_KEYS.DOCUMENTS, memoryState.documents);
  }

  static setUserSettingsFromCloud(settings: UserSettings): void {
    if (!settings) return;
    this.init();
    memoryState.settings = {
      ...memoryState.settings,
      ...settings,
    };
    saveToStorage(STORAGE_KEYS.SETTINGS, memoryState.settings);
  }

  static clearAllData(): void {
    memoryState.pets = [];
    memoryState.activePetId = '';
    memoryState.settings = { ...INITIAL_SETTINGS };
    memoryState.medications = [];
    memoryState.scheduledDoses = [];
    memoryState.doseLogs = [];
    memoryState.symptoms = [];
    memoryState.inventoryEvents = [];
    memoryState.vetVisits = [];
    memoryState.documents = [];
    memoryState.notifications = [];
    memoryState.notificationAttempts = [];
    if (isClient()) {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem('kira_pet');
      window.dispatchEvent(new CustomEvent('pawcare_synced'));
      window.dispatchEvent(new CustomEvent('pawcare_pet_changed', { detail: { petId: '' } }));
    }
  }
}
