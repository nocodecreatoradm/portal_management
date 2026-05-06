-- Migration to add missing certificate columns to rd_inventory table
-- Created at: 2026-05-06T17:45:00

-- 1. Add certificate column (for the latest certificate filename/URL)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'rd_inventory' 
                   AND column_name = 'certificate') THEN
        ALTER TABLE public.rd_inventory ADD COLUMN certificate text;
    END IF;
END $$;

-- 2. Add certificates column (for history, stored as JSONB)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'rd_inventory' 
                   AND column_name = 'certificates') THEN
        ALTER TABLE public.rd_inventory ADD COLUMN certificates jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 3. Ensure other expected columns exist (based on mappings.ts)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'rd_inventory' 
                   AND column_name = 'manual_file') THEN
        ALTER TABLE public.rd_inventory ADD COLUMN manual_file jsonb;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'rd_inventory' 
                   AND column_name = 'photos') THEN
        ALTER TABLE public.rd_inventory ADD COLUMN photos jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 4. Refresh PostgREST cache (optional but helpful if done via SQL editor)
-- NOTIFY pgrst, 'reload schema';
