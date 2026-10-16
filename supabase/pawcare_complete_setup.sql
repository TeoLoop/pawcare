-- ==============================================================================
-- PawCare - Esquema Completo PostgreSQL para Supabase (Turnkey Migration)
-- Zona horaria recomendada: America/Montevideo (UTC-3)
-- Incluye: 13 tablas normalizadas, Índices, Triggers automáticos, RLS y Storage
-- ==============================================================================

-- 0. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Extiende auth.users de Supabase)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ------------------------------------------------------------------------------
-- 2. PETS (Multi-mascota: Kira, etc.)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT NOT NULL DEFAULT 'Canino',
    breed TEXT,
    birth_date DATE,
    weight_kg NUMERIC(5,2),
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ------------------------------------------------------------------------------
-- 3. USER_SETTINGS (Preferencias de usuario y WhatsApp)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 4. MEDICATIONS (Ficha técnica y stock del medicamento)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active_substance TEXT,
    presentation TEXT NOT NULL, -- 'Comprimidos', 'Gotas', 'Jarabe', etc.
    dose_amount NUMERIC(6,2) NOT NULL,
    dose_unit TEXT NOT NULL, -- 'mg', 'comprimido', 'ml', 'gotas'
    instructions TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    track_inventory BOOLEAN NOT NULL DEFAULT false,
    current_stock NUMERIC(6,2) NOT NULL DEFAULT 0,
    low_stock_threshold NUMERIC(6,2) NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ------------------------------------------------------------------------------
-- 5. MEDICATION_SCHEDULES (Pautas de dosificación)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medication_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    frequency_type TEXT NOT NULL, -- 'daily', 'specific_days', 'interval_hours', 'as_needed'
    days_of_week INTEGER[], -- 0=Domingo, 1=Lunes ... 6=Sábado
    times_of_day TEXT[] NOT NULL, -- ['08:00', '20:00']
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ------------------------------------------------------------------------------
-- 6. SCHEDULED_DOSES (Tomas concretas generadas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduled_doses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.medication_schedules(id) ON DELETE SET NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    scheduled_date TEXT NOT NULL, -- YYYY-MM-DD
    scheduled_time TEXT NOT NULL, -- HH:MM
    dose_amount NUMERIC(6,2) NOT NULL,
    dose_unit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'pending', 'administered', 'skipped', 'delayed', 'cancelled'
    confirmation_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_pawcare_medication_scheduled_for UNIQUE (medication_id, scheduled_for)
);

-- ------------------------------------------------------------------------------
-- 7. DOSE_LOGS (Historial de administración de tomas)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 8. NOTIFICATION_JOBS (Cola de recordatorios de WhatsApp)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 9. NOTIFICATION_ATTEMPTS (Auditoría de envíos a Meta Cloud API)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 10. SYMPTOM_LOGS (Registro clínico diario)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.symptom_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    pain_level INTEGER NOT NULL CHECK (pain_level >= 0 AND pain_level <= 10),
    mobility TEXT NOT NULL CHECK (mobility IN ('normal', 'somewhat_limited', 'severely_limited')),
    walking_ability TEXT NOT NULL CHECK (walking_ability IN ('normal', 'limping', 'needs_assistance', 'unable')),
    paw_support TEXT NOT NULL,
    appetite TEXT NOT NULL CHECK (appetite IN ('normal', 'increased', 'decreased', 'none')),
    behavior TEXT NOT NULL CHECK (behavior IN ('calm', 'playful', 'lethargic', 'anxious', 'restless')),
    notes TEXT,
    media_urls TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ------------------------------------------------------------------------------
-- 11. MEDICATION_INVENTORY_EVENTS (Movimientos de stock)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 12. VET_VISITS (Consultas e informes profesionales)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 13. MEDICAL_DOCUMENTS (Recetas y análisis adjuntos)
-- ------------------------------------------------------------------------------
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

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_pets_owner ON public.pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_medications_pet ON public.medications(pet_id);
CREATE INDEX IF NOT EXISTS idx_schedules_medication ON public.medication_schedules(medication_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_pet ON public.scheduled_doses(pet_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_medication ON public.scheduled_doses(medication_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_scheduled_for ON public.scheduled_doses(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_doses_token ON public.scheduled_doses(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_dose_logs_pet ON public.dose_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_dose_logs_medication ON public.dose_logs(medication_id);
CREATE INDEX IF NOT EXISTS idx_dose_logs_scheduled_time ON public.dose_logs(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_status_scheduled ON public.notification_jobs(status, scheduled_send_at);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_idempotency ON public.notification_jobs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_pet_logged_at ON public.symptom_logs(pet_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_events_medication ON public.medication_inventory_events(medication_id);
CREATE INDEX IF NOT EXISTS idx_vet_visits_pet_date ON public.vet_visits(pet_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_docs_pet ON public.medical_documents(pet_id);

-- ==============================================================================
-- TRIGGER PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ==============================================================================
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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - SEGURIDAD POR USUARIO
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_doses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_inventory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pet_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'co_owner',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(pet_id, user_id)
);

ALTER TABLE public.pet_guardians ENABLE ROW LEVEL SECURITY;

-- 1. Helper SECURITY DEFINER functions to break circular RLS dependencies
CREATE OR REPLACE FUNCTION public.is_pet_guardian(p_pet_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.pet_guardians
        WHERE pet_id = p_pet_id AND user_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_pet_owner(p_pet_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.pets
        WHERE id = p_pet_id AND owner_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.check_user_owns_pet(p_pet_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE id = p_pet_id AND owner_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.pet_guardians
            WHERE pet_id = p_pet_id AND user_id = auth.uid()
        )
    );
$$;

-- 2. Policies for pet_guardians table
DROP POLICY IF EXISTS "Users can view guardians of their pets" ON public.pet_guardians;
CREATE POLICY "Users can view guardians of their pets"
    ON public.pet_guardians FOR SELECT
    USING (
        user_id = auth.uid() OR public.is_pet_owner(pet_id, auth.uid())
    );

DROP POLICY IF EXISTS "Owners can add guardians to their pets" ON public.pet_guardians;
CREATE POLICY "Owners can add guardians to their pets"
    ON public.pet_guardians FOR INSERT
    WITH CHECK (
        public.is_pet_owner(pet_id, auth.uid())
    );

DROP POLICY IF EXISTS "Owners and guardians can remove membership" ON public.pet_guardians;
CREATE POLICY "Owners and guardians can remove membership"
    ON public.pet_guardians FOR DELETE
    USING (
        user_id = auth.uid() OR public.is_pet_owner(pet_id, auth.uid())
    );

-- 1. Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Pets
DROP POLICY IF EXISTS "Users can view their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can view their own or shared pets" ON public.pets;
CREATE POLICY "Users can view their own or shared pets" ON public.pets FOR SELECT USING (
    auth.uid() = owner_id OR public.is_pet_guardian(id, auth.uid())
);
DROP POLICY IF EXISTS "Users can insert their own pets" ON public.pets;
CREATE POLICY "Users can insert their own pets" ON public.pets FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Users can update their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update their own or shared pets" ON public.pets;
CREATE POLICY "Users can update their own or shared pets" ON public.pets FOR UPDATE USING (
    auth.uid() = owner_id OR public.is_pet_guardian(id, auth.uid())
);
DROP POLICY IF EXISTS "Users can delete their own pets" ON public.pets;
CREATE POLICY "Users can delete their own pets" ON public.pets FOR DELETE USING (auth.uid() = owner_id);

-- 3. Settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- 4. Medications
DROP POLICY IF EXISTS "Users can view medications of their pets" ON public.medications;
CREATE POLICY "Users can view medications of their pets" ON public.medications FOR SELECT USING (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can insert medications for their pets" ON public.medications;
CREATE POLICY "Users can insert medications for their pets" ON public.medications FOR INSERT WITH CHECK (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can update medications for their pets" ON public.medications;
CREATE POLICY "Users can update medications for their pets" ON public.medications FOR UPDATE USING (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can delete medications of their pets" ON public.medications;
CREATE POLICY "Users can delete medications of their pets" ON public.medications FOR DELETE USING (public.check_user_owns_pet(pet_id));

-- 5. Schedules
DROP POLICY IF EXISTS "Users can view schedules of their medications" ON public.medication_schedules;
CREATE POLICY "Users can view schedules of their medications" ON public.medication_schedules FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.medications m JOIN public.pets p ON p.id = m.pet_id WHERE m.id = medication_schedules.medication_id AND p.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can insert schedules for their medications" ON public.medication_schedules;
CREATE POLICY "Users can insert schedules for their medications" ON public.medication_schedules FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.medications m JOIN public.pets p ON p.id = m.pet_id WHERE m.id = medication_schedules.medication_id AND p.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can update schedules for their medications" ON public.medication_schedules;
CREATE POLICY "Users can update schedules for their medications" ON public.medication_schedules FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.medications m JOIN public.pets p ON p.id = m.pet_id WHERE m.id = medication_schedules.medication_id AND p.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can delete schedules for their medications" ON public.medication_schedules;
CREATE POLICY "Users can delete schedules for their medications" ON public.medication_schedules FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.medications m JOIN public.pets p ON p.id = m.pet_id WHERE m.id = medication_schedules.medication_id AND p.owner_id = auth.uid())
);

-- 6. Scheduled Doses (Includes token lookups for public link confirmation)
DROP POLICY IF EXISTS "Users can view scheduled doses of their pets" ON public.scheduled_doses;
CREATE POLICY "Users can view scheduled doses of their pets" ON public.scheduled_doses FOR SELECT USING (
    public.check_user_owns_pet(pet_id) OR confirmation_token IS NOT NULL
);
DROP POLICY IF EXISTS "Users can insert scheduled doses for their pets" ON public.scheduled_doses;
CREATE POLICY "Users can insert scheduled doses for their pets" ON public.scheduled_doses FOR INSERT WITH CHECK (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can update scheduled doses for their pets" ON public.scheduled_doses;
CREATE POLICY "Users can update scheduled doses for their pets" ON public.scheduled_doses FOR UPDATE USING (
    public.check_user_owns_pet(pet_id) OR confirmation_token IS NOT NULL
);
DROP POLICY IF EXISTS "Users can delete scheduled doses for their pets" ON public.scheduled_doses;
CREATE POLICY "Users can delete scheduled doses for their pets" ON public.scheduled_doses FOR DELETE USING (public.check_user_owns_pet(pet_id));

-- 7. Dose Logs
DROP POLICY IF EXISTS "Users can view dose logs of their pets" ON public.dose_logs;
CREATE POLICY "Users can view dose logs of their pets" ON public.dose_logs FOR SELECT USING (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can insert dose logs for their pets" ON public.dose_logs;
CREATE POLICY "Users can insert dose logs for their pets" ON public.dose_logs FOR INSERT WITH CHECK (
    public.check_user_owns_pet(pet_id) OR auth.uid() IS NULL -- Permite registro vía token de confirmación
);
DROP POLICY IF EXISTS "Users can update dose logs for their pets" ON public.dose_logs;
CREATE POLICY "Users can update dose logs for their pets" ON public.dose_logs FOR UPDATE USING (public.check_user_owns_pet(pet_id));

-- 8. Symptoms
DROP POLICY IF EXISTS "Users can view symptom logs of their pets" ON public.symptom_logs;
CREATE POLICY "Users can view symptom logs of their pets" ON public.symptom_logs FOR SELECT USING (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can insert symptom logs for their pets" ON public.symptom_logs;
CREATE POLICY "Users can insert symptom logs for their pets" ON public.symptom_logs FOR INSERT WITH CHECK (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can update symptom logs for their pets" ON public.symptom_logs;
CREATE POLICY "Users can update symptom logs for their pets" ON public.symptom_logs FOR UPDATE USING (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can delete symptom logs for their pets" ON public.symptom_logs;
CREATE POLICY "Users can delete symptom logs for their pets" ON public.symptom_logs FOR DELETE USING (public.check_user_owns_pet(pet_id));

-- 9. Inventory Events
DROP POLICY IF EXISTS "Users can view inventory events of their medications" ON public.medication_inventory_events;
CREATE POLICY "Users can view inventory events of their medications" ON public.medication_inventory_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.medications m JOIN public.pets p ON p.id = m.pet_id WHERE m.id = medication_inventory_events.medication_id AND p.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can insert inventory events for their medications" ON public.medication_inventory_events;
CREATE POLICY "Users can insert inventory events for their medications" ON public.medication_inventory_events FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.medications m JOIN public.pets p ON p.id = m.pet_id WHERE m.id = medication_inventory_events.medication_id AND p.owner_id = auth.uid())
);

-- 10. Vet Visits
DROP POLICY IF EXISTS "Users can view vet visits of their pets" ON public.vet_visits;
CREATE POLICY "Users can view vet visits of their pets" ON public.vet_visits FOR SELECT USING (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can insert vet visits for their pets" ON public.vet_visits;
CREATE POLICY "Users can insert vet visits for their pets" ON public.vet_visits FOR INSERT WITH CHECK (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can update vet visits for their pets" ON public.vet_visits;
CREATE POLICY "Users can update vet visits for their pets" ON public.vet_visits FOR UPDATE USING (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can delete vet visits of their pets" ON public.vet_visits;
CREATE POLICY "Users can delete vet visits of their pets" ON public.vet_visits FOR DELETE USING (public.check_user_owns_pet(pet_id));

-- 11. Medical Documents
DROP POLICY IF EXISTS "Users can view medical documents of their pets" ON public.medical_documents;
CREATE POLICY "Users can view medical documents of their pets" ON public.medical_documents FOR SELECT USING (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can insert medical documents for their pets" ON public.medical_documents;
CREATE POLICY "Users can insert medical documents for their pets" ON public.medical_documents FOR INSERT WITH CHECK (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can update medical documents for their pets" ON public.medical_documents;
CREATE POLICY "Users can update medical documents for their pets" ON public.medical_documents FOR UPDATE USING (public.check_user_owns_pet(pet_id));
DROP POLICY IF EXISTS "Users can delete medical documents of their pets" ON public.medical_documents;
CREATE POLICY "Users can delete medical documents of their pets" ON public.medical_documents FOR DELETE USING (public.check_user_owns_pet(pet_id));

-- 12. Notification Jobs & Attempts (Acceso servicio y usuario dueño)
DROP POLICY IF EXISTS "Users can view notification jobs for their scheduled doses" ON public.notification_jobs;
CREATE POLICY "Users can view notification jobs for their scheduled doses" ON public.notification_jobs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.scheduled_doses sd JOIN public.pets p ON p.id = sd.pet_id WHERE sd.id = notification_jobs.scheduled_dose_id AND p.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can view notification attempts for their jobs" ON public.notification_attempts;
CREATE POLICY "Users can view notification attempts for their jobs" ON public.notification_attempts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.notification_jobs nj JOIN public.scheduled_doses sd ON sd.id = nj.scheduled_dose_id JOIN public.pets p ON p.id = sd.pet_id WHERE nj.id = notification_attempts.job_id AND p.owner_id = auth.uid())
);

-- ==============================================================================
-- TRIGGER AUTOMÁTICO DE REGISTRO DE USUARIO
-- Crea el perfil, la mascota inicial 'Kira' y los ajustes al registrarse en Auth
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_pet_id UUID;
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Tutor'));

    INSERT INTO public.pets (owner_id, name, species, breed, notes)
    VALUES (NEW.id, 'Kira', 'Canino', 'Mestiza (tipo Pastor)', 'Sensible del estómago. Administrar antiinflamatorios con alimento.')
    RETURNING id INTO new_pet_id;

    INSERT INTO public.user_settings (user_id, pet_id, timezone, reminders_enabled, advance_notice_minutes)
    VALUES (NEW.id, new_pet_id, 'America/Montevideo', true, 15);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- STORAGE BUCKET PARA DOCUMENTOS Y FOTOS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('pawcare_media', 'pawcare_media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Media bucket public select" ON storage.objects;
CREATE POLICY "Media bucket public select" ON storage.objects FOR SELECT USING (bucket_id = 'pawcare_media');

DROP POLICY IF EXISTS "Media bucket authenticated upload" ON storage.objects;
CREATE POLICY "Media bucket authenticated upload" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'pawcare_media' AND auth.role() = 'authenticated'
);
