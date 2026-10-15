-- Kira Care - Initial PostgreSQL Schema Migration
-- Timezone: America/Montevideo
-- Supabase Row Level Security (RLS) included

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. PETS
CREATE TABLE IF NOT EXISTS public.pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Kira',
    species TEXT NOT NULL DEFAULT 'Perro',
    breed TEXT,
    birth_date DATE,
    weight_kg NUMERIC(5,2),
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. USER_SETTINGS
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    timezone TEXT NOT NULL DEFAULT 'America/Montevideo',
    whatsapp_phone TEXT,
    reminders_enabled BOOLEAN NOT NULL DEFAULT true,
    advance_notice_minutes INTEGER NOT NULL DEFAULT 15,
    pending_dose_alert BOOLEAN NOT NULL DEFAULT true,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    inventory_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. MEDICATIONS
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active_substance TEXT,
    presentation TEXT NOT NULL, -- e.g. "Comprimidos", "Gotas", "Jarabe", "Cápsulas"
    dose_amount NUMERIC(6,2) NOT NULL,
    dose_unit TEXT NOT NULL, -- e.g. "comprimido", "mg", "ml", "gotas"
    instructions TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    track_inventory BOOLEAN NOT NULL DEFAULT false,
    current_stock NUMERIC(6,2) NOT NULL DEFAULT 0,
    low_stock_threshold NUMERIC(6,2) NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. MEDICATION_SCHEDULES
CREATE TABLE IF NOT EXISTS public.medication_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    frequency_type TEXT NOT NULL, -- 'daily', 'specific_days', 'interval_hours', 'as_needed'
    days_of_week INTEGER[], -- 0=Sunday, 1=Monday ... 6=Saturday
    times_of_day TEXT[] NOT NULL, -- e.g. ARRAY['08:00', '20:00']
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. SCHEDULED_DOSES (instances of scheduled doses)
CREATE TABLE IF NOT EXISTS public.scheduled_doses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.medication_schedules(id) ON DELETE SET NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    scheduled_date TEXT NOT NULL, -- YYYY-MM-DD in local time
    scheduled_time TEXT NOT NULL, -- HH:MM in local time
    dose_amount NUMERIC(6,2) NOT NULL,
    dose_unit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'pending', 'administered', 'skipped', 'delayed', 'cancelled'
    confirmation_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_medication_scheduled_for UNIQUE (medication_id, scheduled_for)
);

-- 7. DOSE_LOGS (audit of actions taken on doses)
CREATE TABLE IF NOT EXISTS public.dose_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_dose_id UUID REFERENCES public.scheduled_doses(id) ON DELETE SET NULL,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE RESTRICT,
    status TEXT NOT NULL, -- 'administered', 'skipped', 'delayed'
    scheduled_time TIMESTAMPTZ NOT NULL,
    administered_at TIMESTAMPTZ NOT NULL,
    registered_by TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'whatsapp_link', 'whatsapp_webhook'
    reason_skipped TEXT,
    notes TEXT,
    inventory_deducted NUMERIC(6,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 8. NOTIFICATION_JOBS
CREATE TABLE IF NOT EXISTS public.notification_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_dose_id UUID NOT NULL REFERENCES public.scheduled_doses(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL UNIQUE,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    recipient_phone TEXT NOT NULL,
    scheduled_send_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled'
    attempts_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    meta_message_id TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 9. NOTIFICATION_ATTEMPTS
CREATE TABLE IF NOT EXISTS public.notification_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.notification_jobs(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    status TEXT NOT NULL, -- 'success', 'failure'
    response_payload JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 10. SYMPTOM_LOGS
CREATE TABLE IF NOT EXISTS public.symptom_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    pain_level INTEGER NOT NULL CHECK (pain_level >= 0 AND pain_level <= 10),
    mobility TEXT NOT NULL CHECK (mobility IN ('normal', 'somewhat_limited', 'severely_limited')),
    walking_ability TEXT NOT NULL CHECK (walking_ability IN ('normal', 'limping', 'needs_assistance', 'unable')),
    paw_support TEXT NOT NULL, -- 'all_paws', 'favors_front_left', etc.
    appetite TEXT NOT NULL CHECK (appetite IN ('normal', 'increased', 'decreased', 'none')),
    behavior TEXT NOT NULL CHECK (behavior IN ('calm', 'playful', 'lethargic', 'anxious', 'restless')),
    notes TEXT,
    media_urls TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 11. MEDICATION_INVENTORY_EVENTS
CREATE TABLE IF NOT EXISTS public.medication_inventory_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('restock', 'dose_administered', 'adjustment', 'waste')),
    quantity_delta NUMERIC(6,2) NOT NULL,
    resulting_stock NUMERIC(6,2) NOT NULL,
    dose_log_id UUID REFERENCES public.dose_logs(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 12. VET_VISITS
CREATE TABLE IF NOT EXISTS public.vet_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    visit_date TIMESTAMPTZ NOT NULL,
    clinic_name TEXT,
    veterinarian_name TEXT,
    reason TEXT NOT NULL,
    diagnosis TEXT,
    professional_recommendations TEXT,
    next_appointment_at TIMESTAMPTZ,
    cost NUMERIC(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 13. MEDICAL_DOCUMENTS
CREATE TABLE IF NOT EXISTS public.medical_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    vet_visit_id UUID REFERENCES public.vet_visits(id) ON DELETE SET NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('prescription', 'lab_result', 'xray', 'discharge_summary', 'other')),
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    notes TEXT,
    document_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pets_owner ON public.pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_medications_pet ON public.medications(pet_id);
CREATE INDEX IF NOT EXISTS idx_schedules_medication ON public.medication_schedules(medication_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_medication ON public.scheduled_doses(medication_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_scheduled_for ON public.scheduled_doses(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_token ON public.scheduled_doses(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_dose_logs_scheduled_time ON public.dose_logs(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_dose_logs_medication ON public.dose_logs(medication_id);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_status_scheduled ON public.notification_jobs(status, scheduled_send_at);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_idempotency ON public.notification_jobs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_pet_logged_at ON public.symptom_logs(pet_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_events_medication ON public.medication_inventory_events(medication_id);
CREATE INDEX IF NOT EXISTS idx_vet_visits_pet_date ON public.vet_visits(pet_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_docs_pet ON public.medical_documents(pet_id);

-- Updated at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;
            CREATE TRIGGER trg_set_updated_at
            BEFORE UPDATE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', tbl, tbl);
    END LOOP;
END;
$$;
