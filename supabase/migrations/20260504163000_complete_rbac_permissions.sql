-- Complete RBAC Permissions for all modules
-- This script ensures all processes have their corresponding permissions in the database

-- 1. Insert permissions for each module if they don't exist
INSERT INTO public.permissions (name, description, module)
VALUES
  -- Calendar
  ('calendar:view', 'Ver calendario de actividades', 'calendar'),
  ('calendar:create', 'Crear nuevas tareas o eventos', 'calendar'),
  ('calendar:edit', 'Editar tareas o eventos existentes', 'calendar'),
  ('calendar:delete', 'Eliminar tareas o eventos', 'calendar'),

  -- Work Plan
  ('work_plan:view', 'Ver plan de trabajo', 'work_plan'),
  ('work_plan:edit', 'Editar plan de trabajo', 'work_plan'),

  -- Artwork Followup
  ('artwork:view', 'Ver seguimiento de artes', 'artwork_followup'),
  ('artwork:edit', 'Editar/Subir artes', 'artwork_followup'),
  ('artwork:approve', 'Aprobar/Rechazar artes', 'artwork_followup'),

  -- Technical Datasheets
  ('technical_sheets:view', 'Ver fichas técnicas', 'technical_datasheet'),
  ('technical_sheets:edit', 'Editar fichas técnicas', 'technical_datasheet'),
  ('technical_sheets:approve', 'Aprobar fichas técnicas', 'technical_datasheet'),

  -- Commercial Datasheets
  ('commercial_sheets:view', 'Ver fichas comerciales', 'commercial_datasheet'),
  ('commercial_sheets:edit', 'Editar fichas comerciales', 'commercial_datasheet'),
  ('commercial_sheets:approve', 'Aprobar fichas comerciales', 'commercial_datasheet'),

  -- Samples
  ('samples:view', 'Ver listado de muestras', 'samples'),
  ('samples:create', 'Registrar nuevas muestras', 'samples'),
  ('samples:edit', 'Editar información de muestras', 'samples'),
  ('samples:inspect', 'Realizar inspecciones técnicas', 'samples'),
  ('samples:approve', 'Aprobar/Rechazar muestras', 'samples'),

  -- Product Catalog
  ('catalog:view', 'Ver catálogo de productos', 'product_management'),
  ('catalog:edit', 'Editar información de productos', 'product_management'),
  ('catalog:delete', 'Eliminar productos', 'product_management'),

  -- Energy Efficiency
  ('efficiency:view', 'Ver eficiencia energética', 'energy_efficiency'),
  ('efficiency:edit', 'Gestionar certificados y etiquetas', 'energy_efficiency'),

  -- R&D Projects
  ('projects:view', 'Ver proyectos de I+D', 'rd_projects'),
  ('projects:create', 'Crear proyectos de I+D', 'rd_projects'),
  ('projects:edit', 'Editar proyectos de I+D', 'rd_projects'),
  ('projects:delete', 'Eliminar proyectos de I+D', 'rd_projects'),

  -- Innovation Proposals
  ('proposals:view', 'Ver propuestas de innovación', 'innovation_proposals'),
  ('proposals:create', 'Crear propuestas de innovación', 'innovation_proposals'),
  ('proposals:evaluate', 'Evaluar propuestas', 'innovation_proposals'),

  -- Inventory
  ('inventory:view', 'Ver inventario de equipos', 'rd_inventory'),
  ('inventory:edit', 'Gestionar equipos y calibraciones', 'rd_inventory'),

  -- Suppliers
  ('suppliers:view', 'Ver maestro de proveedores', 'supplier_master'),
  ('suppliers:edit', 'Gestionar información de proveedores', 'supplier_master'),
  ('suppliers:evaluate', 'Realizar evaluaciones de proveedores', 'supplier_master'),

  -- Calculations
  ('calculations:view', 'Ver tablero de cálculos', 'calculations_dashboard'),
  ('calculations:run', 'Ejecutar nuevos cálculos o simulaciones', 'calculations_dashboard'),
  ('water_demand:view', 'Ver cálculo de demanda de agua', 'calculations'),
  ('gas_heater:view', 'Ver pruebas experimentales de calentadores', 'calculations'),
  ('absorption:view', 'Ver cálculos de absorción', 'calculations'),
  ('temp_loss:view', 'Ver cálculos de pérdida de temperatura', 'calculations'),
  ('oven:view', 'Ver pruebas de hornos', 'calculations'),
  ('coating:view', 'Ver análisis de recubrimiento Cr-Ni', 'calculations'),

  -- Resources
  ('brandbook:view', 'Ver manual de marca', 'brandbook'),
  ('brandbook:edit', 'Editar manual de marca', 'brandbook'),
  ('regulations:view', 'Ver normativas NTP', 'ntp_regulations'),
  ('regulations:edit', 'Gestionar normativas NTP', 'ntp_regulations'),
  ('fairs:view', 'Ver ferias internacionales', 'canton_fair'),
  ('fairs:edit', 'Gestionar información de ferias', 'canton_fair'),
  ('apps:view', 'Ver aplicaciones y herramientas', 'applications'),
  ('apps:manage', 'Gestionar aplicaciones y herramientas', 'applications'),
  ('records:view', 'Ver registros base', 'records'),
  ('records:edit', 'Editar registros base', 'records'),

  -- Approved Archives
  ('approved_artworks:view', 'Ver artes aprobados', 'historical_archive'),
  ('approved_technical:view', 'Ver fichas técnicas aprobadas', 'historical_archive'),
  ('approved_commercial:view', 'Ver fichas comerciales aprobadas', 'historical_archive'),

  -- Admin
  ('users:view', 'Ver gestión de usuarios', 'user_management'),
  ('users:edit', 'Editar perfiles de usuario', 'user_management'),
  ('roles:manage', 'Gestionar roles y permisos', 'user_management')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  module = EXCLUDED.module;

-- 2. Ensure standard roles have basic permissions (optional, but helpful for seed)
-- We can't easily do this without role IDs, but we can do it by role name if we join

-- Admin role gets all permissions (already handled in UI/Context, but good for DB level)
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM public.roles WHERE name = 'admin';
  IF admin_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT admin_id, id FROM public.permissions
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
