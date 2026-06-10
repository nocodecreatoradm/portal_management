-- Add comments column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS comments text;
