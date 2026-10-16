-- Kira Care - Migration 004: Pet Guardians / Co-tutors Sharing
-- Allows multiple users (couples, family members, co-tutors) to manage and care for the same pet

CREATE TABLE IF NOT EXISTS public.pet_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'co_owner', -- 'co_owner', 'caregiver', 'family'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(pet_id, user_id)
);

-- Enable RLS
ALTER TABLE public.pet_guardians ENABLE ROW LEVEL SECURITY;

-- 1. Policies for pet_guardians table
DROP POLICY IF EXISTS "Users can view guardians of their pets" ON public.pet_guardians;
CREATE POLICY "Users can view guardians of their pets"
    ON public.pet_guardians FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_guardians.pet_id AND pets.owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Owners can add guardians to their pets" ON public.pet_guardians;
CREATE POLICY "Owners can add guardians to their pets"
    ON public.pet_guardians FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_guardians.pet_id AND pets.owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Owners and guardians can remove membership" ON public.pet_guardians;
CREATE POLICY "Owners and guardians can remove membership"
    ON public.pet_guardians FOR DELETE
    USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_guardians.pet_id AND pets.owner_id = auth.uid())
    );

-- 2. Update check_user_owns_pet helper function to include co-owners/guardians
CREATE OR REPLACE FUNCTION public.check_user_owns_pet(p_pet_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.pets
        WHERE id = p_pet_id AND owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.pet_guardians
        WHERE pet_id = p_pet_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update pets SELECT policy to let co-owners view the pet
DROP POLICY IF EXISTS "Users can view their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can view their own or shared pets" ON public.pets;
CREATE POLICY "Users can view their own or shared pets"
    ON public.pets FOR SELECT
    USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM public.pet_guardians
            WHERE pet_guardians.pet_id = public.pets.id AND pet_guardians.user_id = auth.uid()
        )
    );

-- 4. Update pets UPDATE policy so co-owners can update weight, notes, etc.
DROP POLICY IF EXISTS "Users can update their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update their own or shared pets" ON public.pets;
CREATE POLICY "Users can update their own or shared pets"
    ON public.pets FOR UPDATE
    USING (public.check_user_owns_pet(id));
