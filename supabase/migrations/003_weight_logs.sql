-- ==============================================================================
-- 003_weight_logs.sql
-- Historial cronológico de control de peso por mascota
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.weight_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    weight_kg NUMERIC(5,2) NOT NULL,
    logged_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_pet_id ON public.weight_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_logged_date ON public.weight_logs(logged_date DESC);

-- Habilitar Row Level Security
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage weight logs for their pets"
ON public.weight_logs
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.pets
        WHERE public.pets.id = public.weight_logs.pet_id
        AND public.pets.owner_id = auth.uid()
    )
);
