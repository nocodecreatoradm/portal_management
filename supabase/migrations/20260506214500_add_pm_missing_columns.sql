-- Add missing columns to product_management table
ALTER TABLE public.product_management 
ADD COLUMN IF NOT EXISTS correlative_id text,
ADD COLUMN IF NOT EXISTS approved_documents jsonb DEFAULT '[]'::jsonb;

-- Update existing records to have empty array for approved_documents if null
UPDATE public.product_management 
SET approved_documents = '[]'::jsonb 
WHERE approved_documents IS NULL;
