-- Fix relationship between product_management and samples
-- This migration ensures that sample_id can be used for joins in the future

DO $$ 
BEGIN
    -- 1. Try to convert sample_id to uuid if it's currently text
    -- This will only work if the existing data are valid UUIDs or NULL
    BEGIN
        ALTER TABLE public.product_management 
        ALTER COLUMN sample_id TYPE uuid USING sample_id::uuid;
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not convert sample_id to UUID, skipping type change. Error: %', SQLERRM;
    END;

    -- 2. Add the foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'product_management_sample_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.product_management
            ADD CONSTRAINT product_management_sample_id_fkey 
            FOREIGN KEY (sample_id) REFERENCES public.samples(id);
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Could not add foreign key constraint. Ensure samples table exists and sample_id values match. Error: %', SQLERRM;
        END;
    END IF;
END $$;
