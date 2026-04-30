-- 1. Create product_management table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.product_management (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sap_code text,
  sap_description text,
  ean_code text,
  brand_id uuid REFERENCES public.brands(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  line_id uuid REFERENCES public.product_lines(id),
  sample_id text,
  commercial_status text,
  quality_inspection_date date,
  fob_price numeric DEFAULT 0,
  fob_price_history jsonb DEFAULT '[]'::jsonb,
  explode_files jsonb DEFAULT '[]'::jsonb,
  additional_provider_documents jsonb DEFAULT '[]'::jsonb,
  gallery jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS on product_management
ALTER TABLE public.product_management ENABLE ROW LEVEL SECURITY;

-- 3. Add policies for product_management
CREATE POLICY "Allow authenticated read" ON public.product_management
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write for admins" ON public.product_management
  FOR ALL TO authenticated USING (check_role(ARRAY['admin'::text]));

-- 4. Add UPDATE policy for profiles
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (check_role(ARRAY['admin'::text]));

-- 5. Add INSERT/UPDATE/DELETE policies for roles and permissions (Admin only)
CREATE POLICY "Admins can manage roles" ON public.roles
  FOR ALL TO authenticated USING (check_role(ARRAY['admin'::text]));

CREATE POLICY "Admins can manage permissions" ON public.permissions
  FOR ALL TO authenticated USING (check_role(ARRAY['admin'::text]));

CREATE POLICY "Admins can manage role_permissions" ON public.role_permissions
  FOR ALL TO authenticated USING (check_role(ARRAY['admin'::text]));

-- 6. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Apply updated_at trigger to main tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'products', 'samples', 'projects', 'product_management', 'suppliers')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;
