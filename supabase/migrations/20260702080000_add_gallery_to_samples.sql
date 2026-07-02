-- Add gallery column to samples table if it doesn't exist
ALTER TABLE public.samples
  ADD COLUMN IF NOT EXISTS gallery jsonb DEFAULT '[]'::jsonb;

-- Add calculation_ids column to samples table if it doesn't exist
ALTER TABLE public.samples
  ADD COLUMN IF NOT EXISTS calculation_ids jsonb DEFAULT '[]'::jsonb;
