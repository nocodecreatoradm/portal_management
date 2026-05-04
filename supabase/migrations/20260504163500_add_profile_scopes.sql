-- Migration: Add scopes (brand/line access) to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scopes jsonb DEFAULT '[]'::jsonb;

-- Comment for the new column
COMMENT ON COLUMN public.profiles.scopes IS 'Array of objects defining brand and line access: [{"brand": "Marca", "line": "Linea"}]';
