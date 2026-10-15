// src/types/medication.ts

export type DoseStatus =
  | 'scheduled'
  | 'pending'
  | 'administered'
  | 'skipped'
  | 'delayed'
  | 'cancelled';

export type FrequencyType =
  | 'daily'
  | 'specific_days'
  | 'interval_hours'
  | 'as_needed';

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  breed?: string;
  birth_date?: string;
  weight_kg?: number;
  photo_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  pet_id: string;
  name: string;
  active_substance?: string;
  presentation: string; // e.g., "Comprimidos masticables", "Gotas orales", "Jarabe"
  dose_amount: number;
  dose_unit: string; // e.g., "mg", "comprimido", "ml", "gotas"
  instructions?: string;
  notes?: string;
  is_active: boolean;
  track_inventory: boolean;
  current_stock: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  schedule?: MedicationSchedule;
}

export interface MedicationSchedule {
  id: string;
  medication_id: string;
  frequency_type: FrequencyType;
  days_of_week?: number[]; // 0=Sunday, 1=Monday... 6=Saturday
  times_of_day: string[]; // HH:MM in America/Montevideo
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledDose {
  id: string;
  pet_id: string;
  medication_id: string;
  schedule_id?: string;
  scheduled_for: string; // ISO string in UTC
  scheduled_date: string; // YYYY-MM-DD in America/Montevideo
  scheduled_time: string; // HH:MM in America/Montevideo
  dose_amount: number;
  dose_unit: string;
  status: DoseStatus;
  confirmation_token?: string;
  token_expires_at?: string;
  created_at: string;
  updated_at: string;
  medication?: Medication;
  log?: DoseLog;
}

export interface DoseLog {
  id: string;
  scheduled_dose_id?: string;
  pet_id: string;
  medication_id: string;
  status: 'administered' | 'skipped' | 'delayed';
  scheduled_time: string;
  administered_at: string;
  registered_by: 'manual' | 'whatsapp_link' | 'whatsapp_webhook';
  reason_skipped?: string;
  notes?: string;
  inventory_deducted: number;
  created_at: string;
  updated_at: string;
  medication?: Medication;
}
