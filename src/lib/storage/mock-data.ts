// src/lib/storage/mock-data.ts
import { Pet, Medication, ScheduledDose } from '@/types/medication';
import { SymptomLog } from '@/types/health';
import { VetVisit, MedicalDocument } from '@/types/veterinary';
import { UserSettings } from '@/types/settings';
import { generateScheduleDoses, getLocalDateString } from '@/lib/date-utils';

export const INITIAL_PET: Pet = {
  id: 'pet-kira-001',
  owner_id: 'user-default-001',
  name: 'Kira',
  species: 'Canino',
  breed: 'Mestiza (tipo Pastor)',
  birth_date: '2018-04-12',
  weight_kg: 24.5,
  photo_url: '',
  notes: 'Sensible del estómago. Administrar antiinflamatorios siempre junto con alimento.',
  created_at: new Date('2026-01-01').toISOString(),
  updated_at: new Date('2026-01-01').toISOString(),
};

export const INITIAL_SETTINGS: UserSettings = {
  id: 'settings-001',
  user_id: 'user-default-001',
  pet_id: 'pet-kira-001',
  timezone: 'America/Montevideo',
  whatsapp_phone: '+59899123456',
  reminders_enabled: true,
  advance_notice_minutes: 15,
  pending_dose_alert: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '23:00',
  quiet_hours_end: '07:00',
  inventory_alerts_enabled: true,
  created_at: new Date('2026-01-01').toISOString(),
  updated_at: new Date('2026-01-01').toISOString(),
};

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-001',
    pet_id: 'pet-kira-001',
    name: 'Condroprotector Articular',
    active_substance: 'Glucosamina + Condroitín sulfato',
    presentation: 'Comprimidos masticables',
    dose_amount: 1,
    dose_unit: 'comprimido',
    instructions: 'Dar por la noche después de la cena como premio masticable.',
    notes: 'Tratamiento continuo para soporte de articulaciones.',
    is_active: true,
    track_inventory: true,
    current_stock: 45,
    low_stock_threshold: 10,
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
    schedule: {
      id: 'sched-001',
      medication_id: 'med-001',
      frequency_type: 'daily',
      times_of_day: ['21:00'],
      start_date: '2026-09-01',
      is_active: true,
      created_at: new Date('2026-09-01').toISOString(),
      updated_at: new Date('2026-09-01').toISOString(),
    },
  },
  {
    id: 'med-002',
    pet_id: 'pet-kira-001',
    name: 'Meloxicam 1.5 mg/ml',
    active_substance: 'Meloxicam',
    presentation: 'Suspensión oral',
    dose_amount: 1.2,
    dose_unit: 'ml',
    instructions: 'Administrar en el desayuno con la jeringa dosificadora.',
    notes: 'Pauta antiinflamatoria indicada por 7 días por molestia en pata trasera.',
    is_active: true,
    track_inventory: true,
    current_stock: 18,
    low_stock_threshold: 5,
    created_at: new Date('2026-10-10').toISOString(),
    updated_at: new Date('2026-10-10').toISOString(),
    schedule: {
      id: 'sched-002',
      medication_id: 'med-002',
      frequency_type: 'daily',
      times_of_day: ['09:00'],
      start_date: '2026-10-10',
      end_date: '2026-10-17',
      is_active: true,
      created_at: new Date('2026-10-10').toISOString(),
      updated_at: new Date('2026-10-10').toISOString(),
    },
  },
];

export function buildInitialScheduledDoses(): ScheduledDose[] {
  const doses: ScheduledDose[] = [];
  const todayStr = getLocalDateString();

  INITIAL_MEDICATIONS.forEach((med) => {
    if (!med.schedule) return;

    const generated = generateScheduleDoses(
      {
        frequency_type: med.schedule.frequency_type,
        times_of_day: med.schedule.times_of_day,
        days_of_week: med.schedule.days_of_week,
        start_date: med.schedule.start_date,
        end_date: med.schedule.end_date,
      },
      { previewDays: 5, fromDate: todayStr }
    );

    generated.forEach((g, idx) => {
      doses.push({
        id: `dose-${med.id}-${g.scheduled_date}-${g.scheduled_time.replace(':', '')}`,
        pet_id: med.pet_id,
        medication_id: med.id,
        schedule_id: med.schedule?.id,
        scheduled_for: g.scheduled_for,
        scheduled_date: g.scheduled_date,
        scheduled_time: g.scheduled_time,
        dose_amount: med.dose_amount,
        dose_unit: med.dose_unit,
        status: 'scheduled',
        confirmation_token: `token-${med.id}-${idx}-${Math.random().toString(36).substring(2, 9)}`,
        token_expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        medication: med,
      });
    });
  });

  return doses;
}

export const INITIAL_SYMPTOMS: SymptomLog[] = [
  {
    id: 'symptom-001',
    pet_id: 'pet-kira-001',
    logged_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    pain_level: 3,
    mobility: 'somewhat_limited',
    walking_ability: 'limping',
    paw_support: 'Evita apoyar con fuerza la pata trasera derecha al levantarse',
    appetite: 'normal',
    behavior: 'calm',
    notes: 'Kira se levantó más lenta después de dormir la siesta. Comió toda su ración con entusiasmo.',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

export const INITIAL_VET_VISITS: VetVisit[] = [
  {
    id: 'vet-001',
    pet_id: 'pet-kira-001',
    visit_date: new Date('2026-10-10T14:30:00Z').toISOString(),
    clinic_name: 'Clínica Veterinaria Pocitos',
    veterinarian_name: 'Dra. Valentina Morales',
    reason: 'Control por molestia al caminar y rigidez matutina en cadera derecha',
    diagnosis: 'Principio de artrosis coxofemoral leve.',
    professional_recommendations: 'Iniciar Meloxicam por 7 días con alimento. Mantener Condroprotector. Evitar saltos bruscos a sillones o cama. Control en 15 días.',
    next_appointment_at: new Date('2026-10-25T15:00:00Z').toISOString(),
    cost: 1800,
    created_at: new Date('2026-10-10').toISOString(),
    updated_at: new Date('2026-10-10').toISOString(),
  },
];

export const INITIAL_DOCUMENTS: MedicalDocument[] = [
  {
    id: 'doc-001',
    pet_id: 'pet-kira-001',
    vet_visit_id: 'vet-001',
    document_type: 'prescription',
    title: 'Receta Médica — Meloxicam y Condroprotector',
    file_url: '/documents/receta-kira-oct2026.pdf',
    file_name: 'receta-kira-oct2026.pdf',
    notes: 'Receta oficial firmada por la Dra. Morales.',
    document_date: '2026-10-10',
    created_at: new Date('2026-10-10').toISOString(),
  },
];
