-- Migration: Add missing columns and check_role function to profiles table
-- Ensures compatibility with the UserEditModal fields and policies

-- 1. Ensure columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scopes jsonb DEFAULT '[]'::jsonb;

-- 2. Define check_role function if it doesn't exist (used by RLS policies)
CREATE OR REPLACE FUNCTION public.check_role(allowed_roles text[])
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN (user_role = ANY(allowed_roles));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add comments for documentation
COMMENT ON COLUMN public.profiles.department IS 'User department or area';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the user profile image';
COMMENT ON COLUMN public.profiles.scopes IS 'Array of objects defining brand and line access: [{"brand": "Marca", "line": "Linea"}]';
