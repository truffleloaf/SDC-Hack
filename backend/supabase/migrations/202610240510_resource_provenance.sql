ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS cost text;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS hrd_corp boolean NOT NULL DEFAULT false;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS verified_at text;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS claim_source text;
