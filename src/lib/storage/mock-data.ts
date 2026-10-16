// src/lib/storage/mock-data.ts
import { Pet, Medication, ScheduledDose } from '@/types/medication';
import { SymptomLog } from '@/types/health';
import { VetVisit, MedicalDocument } from '@/types/veterinary';
import { UserSettings } from '@/types/settings';

export const INITIAL_PET: Pet = {
  id: '',
  owner_id: '',
  name: '',
  species: 'Canino',
  breed: undefined,
  birth_date: undefined,
  weight_kg: undefined,
  photo_url: undefined,
  notes: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const INITIAL_PETS: Pet[] = [];

export const INITIAL_SETTINGS: UserSettings = {
  id: '',
  user_id: '',
  pet_id: '',
  timezone: 'America/Montevideo',
  whatsapp_phone: '',
  callmebot_api_key: '',
  reminders_enabled: true,
  advance_notice_minutes: 15,
  pending_dose_alert: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '23:00',
  quiet_hours_end: '07:00',
  inventory_alerts_enabled: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const INITIAL_MEDICATIONS: Medication[] = [];

export function buildInitialScheduledDoses(): ScheduledDose[] {
  return [];
}

export const INITIAL_SYMPTOMS: SymptomLog[] = [];
export const INITIAL_VET_VISITS: VetVisit[] = [];
export const INITIAL_DOCUMENTS: MedicalDocument[] = [];
