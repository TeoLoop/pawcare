-- Kira Care - Row Level Security (RLS) Policies Migration
-- All client-accessible tables protected by strict ownership checks

-- Enable RLS on all tables
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

-- 1. PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. PETS POLICIES
CREATE POLICY "Users can view their own pets"
    ON public.pets FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own pets"
    ON public.pets FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own pets"
    ON public.pets FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own pets"
    ON public.pets FOR DELETE
    USING (auth.uid() = owner_id);

-- 3. USER_SETTINGS POLICIES
CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- Helper function to check pet ownership
CREATE OR REPLACE FUNCTION public.check_user_owns_pet(p_pet_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.pets
        WHERE id = p_pet_id AND owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. MEDICATIONS POLICIES
CREATE POLICY "Users can view medications of their pets"
    ON public.medications FOR SELECT
    USING (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can insert medications for their pets"
    ON public.medications FOR INSERT
    WITH CHECK (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can update medications for their pets"
    ON public.medications FOR UPDATE
    USING (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can delete medications of their pets"
    ON public.medications FOR DELETE
    USING (public.check_user_owns_pet(pet_id));

-- 5. MEDICATION_SCHEDULES POLICIES
CREATE POLICY "Users can view schedules of their medications"
    ON public.medication_schedules FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.medications m
        JOIN public.pets p ON p.id = m.pet_id
        WHERE m.id = medication_schedules.medication_id AND p.owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert schedules for their medications"
    ON public.medication_schedules FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.medications m
        JOIN public.pets p ON p.id = m.pet_id
        WHERE m.id = medication_schedules.medication_id AND p.owner_id = auth.uid()
    ));

CREATE POLICY "Users can update schedules for their medications"
    ON public.medication_schedules FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.medications m
        JOIN public.pets p ON p.id = m.pet_id
        WHERE m.id = medication_schedules.medication_id AND p.owner_id = auth.uid()
    ));

CREATE POLICY "Users can delete schedules for their medications"
    ON public.medication_schedules FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.medications m
        JOIN public.pets p ON p.id = m.pet_id
        WHERE m.id = medication_schedules.medication_id AND p.owner_id = auth.uid()
    ));

-- 6. SCHEDULED_DOSES POLICIES
CREATE POLICY "Users can view scheduled doses of their pets"
    ON public.scheduled_doses FOR SELECT
    USING (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can insert scheduled doses for their pets"
    ON public.scheduled_doses FOR INSERT
    WITH CHECK (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can update scheduled doses for their pets"
    ON public.scheduled_doses FOR UPDATE
    USING (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can delete scheduled doses for their pets"
    ON public.scheduled_doses FOR DELETE
    USING (public.check_user_owns_pet(pet_id));

-- 7. DOSE_LOGS POLICIES
CREATE POLICY "Users can view dose logs of their pets"
    ON public.dose_logs FOR SELECT
    USING (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can insert dose logs for their pets"
    ON public.dose_logs FOR INSERT
    WITH CHECK (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can update dose logs for their pets"
    ON public.dose_logs FOR UPDATE
    USING (public.check_user_owns_pet(pet_id));

-- 8. NOTIFICATION_JOBS POLICIES
CREATE POLICY "Users can view notification jobs for their scheduled doses"
    ON public.notification_jobs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.scheduled_doses sd
        JOIN public.pets p ON p.id = sd.pet_id
        WHERE sd.id = notification_jobs.scheduled_dose_id AND p.owner_id = auth.uid()
    ));

-- 9. NOTIFICATION_ATTEMPTS POLICIES
CREATE POLICY "Users can view notification attempts for their jobs"
    ON public.notification_attempts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.notification_jobs nj
        JOIN public.scheduled_doses sd ON sd.id = nj.scheduled_dose_id
        JOIN public.pets p ON p.id = sd.pet_id
        WHERE nj.id = notification_attempts.job_id AND p.owner_id = auth.uid()
    ));

-- 10. SYMPTOM_LOGS POLICIES
CREATE POLICY "Users can view symptom logs of their pets"
    ON public.symptom_logs FOR SELECT
    USING (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can insert symptom logs for their pets"
    ON public.symptom_logs FOR INSERT
    WITH CHECK (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can update symptom logs for their pets"
    ON public.symptom_logs FOR UPDATE
    USING (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can delete symptom logs for their pets"
    ON public.symptom_logs FOR DELETE
    USING (public.check_user_owns_pet(pet_id));

-- 11. INVENTORY EVENTS POLICIES
CREATE POLICY "Users can view inventory events of their medications"
    ON public.medication_inventory_events FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.medications m
        JOIN public.pets p ON p.id = m.pet_id
        WHERE m.id = medication_inventory_events.medication_id AND p.owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert inventory events for their medications"
    ON public.medication_inventory_events FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.medications m
        JOIN public.pets p ON p.id = m.pet_id
        WHERE m.id = medication_inventory_events.medication_id AND p.owner_id = auth.uid()
    ));

-- 12. VET_VISITS POLICIES
CREATE POLICY "Users can view vet visits of their pets"
    ON public.vet_visits FOR SELECT
    USING (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can insert vet visits for their pets"
    ON public.vet_visits FOR INSERT
    WITH CHECK (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can update vet visits for their pets"
    ON public.vet_visits FOR UPDATE
    USING (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can delete vet visits of their pets"
    ON public.vet_visits FOR DELETE
    USING (public.check_user_owns_pet(pet_id));

-- 13. MEDICAL_DOCUMENTS POLICIES
CREATE POLICY "Users can view medical documents of their pets"
    ON public.medical_documents FOR SELECT
    USING (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can insert medical documents for their pets"
    ON public.medical_documents FOR INSERT
    WITH CHECK (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can update medical documents for their pets"
    ON public.medical_documents FOR UPDATE
    USING (public.check_user_owns_pet(pet_id));

CREATE POLICY "Users can delete medical documents of their pets"
    ON public.medical_documents FOR DELETE
    USING (public.check_user_owns_pet(pet_id));

-- Automatically create profile and pet Kira when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_pet_id UUID;
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Tutor de Kira'));

    INSERT INTO public.pets (owner_id, name, species, breed, notes)
    VALUES (NEW.id, 'Kira', 'Perro', 'Mascota familiar', 'Gestionado a través de Kira Care')
    RETURNING id INTO new_pet_id;

    INSERT INTO public.user_settings (user_id, pet_id, timezone, reminders_enabled)
    VALUES (NEW.id, new_pet_id, 'America/Montevideo', true);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
