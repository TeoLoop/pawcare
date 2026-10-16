-- PawCare Migration 005: Fix RLS Infinite Recursion on Pets and Pet Guardians
-- Soluciona el error "infinite recursion detected in policy for relation pets"

-- 1. Funciones SECURITY DEFINER para desacoplar RLS y evitar ciclos de recursión
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

-- 2. Función helper general check_user_owns_pet
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

-- 3. Políticas para public.pets (sin subconsulta directa que dispare RLS en bucle)
DROP POLICY IF EXISTS "Users can view their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can view their own or shared pets" ON public.pets;
CREATE POLICY "Users can view their own or shared pets"
    ON public.pets FOR SELECT
    USING (
        auth.uid() = owner_id OR public.is_pet_guardian(id, auth.uid())
    );

DROP POLICY IF EXISTS "Users can update their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update their own or shared pets" ON public.pets;
CREATE POLICY "Users can update their own or shared pets"
    ON public.pets FOR UPDATE
    USING (
        auth.uid() = owner_id OR public.is_pet_guardian(id, auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert their own pets" ON public.pets;
CREATE POLICY "Users can insert their own pets"
    ON public.pets FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own pets" ON public.pets;
CREATE POLICY "Users can delete their own pets"
    ON public.pets FOR DELETE
    USING (auth.uid() = owner_id);

-- 4. Políticas para public.pet_guardians
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

-- 5. Asegurar políticas de schedules con soporte para tutores compartidos
DROP POLICY IF EXISTS "Users can view schedules of their medications" ON public.medication_schedules;
CREATE POLICY "Users can view schedules of their medications"
    ON public.medication_schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.medications m
            WHERE m.id = medication_schedules.medication_id AND public.check_user_owns_pet(m.pet_id)
        )
    );

DROP POLICY IF EXISTS "Users can insert schedules for their medications" ON public.medication_schedules;
CREATE POLICY "Users can insert schedules for their medications"
    ON public.medication_schedules FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.medications m
            WHERE m.id = medication_schedules.medication_id AND public.check_user_owns_pet(m.pet_id)
        )
    );

DROP POLICY IF EXISTS "Users can update schedules for their medications" ON public.medication_schedules;
CREATE POLICY "Users can update schedules for their medications"
    ON public.medication_schedules FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.medications m
            WHERE m.id = medication_schedules.medication_id AND public.check_user_owns_pet(m.pet_id)
        )
    );

DROP POLICY IF EXISTS "Users can delete schedules for their medications" ON public.medication_schedules;
CREATE POLICY "Users can delete schedules for their medications"
    ON public.medication_schedules FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.medications m
            WHERE m.id = medication_schedules.medication_id AND public.check_user_owns_pet(m.pet_id)
        )
    );
