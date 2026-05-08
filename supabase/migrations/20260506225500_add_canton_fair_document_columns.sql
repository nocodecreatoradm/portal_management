-- Migration: Add agreements and quotations columns to canton_fair_suppliers
ALTER TABLE canton_fair_suppliers 
ADD COLUMN IF NOT EXISTS agreements JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS quotations JSONB DEFAULT '[]'::jsonb;
