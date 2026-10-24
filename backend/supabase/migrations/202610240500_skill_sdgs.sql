-- Run before deploying the updated optional FastAPI service; live import fills canonical tags.
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS sdgs jsonb NOT NULL DEFAULT '[4]'::jsonb;
