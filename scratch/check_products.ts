import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function test() {
  const tables = [
    'brands', 'product_lines', 'categories', 'samples', 'products',
    'product_management', 'rd_inventory', 'projects', 'project_activities',
    'energy_efficiency_records', 'innovation_proposals', 'calendar_tasks',
    'ntp_regulations', 'suppliers', 'rd_project_templates',
    'brand_documents', 'calculation_records', 'profiles',
    'roles', 'permissions', 'role_permissions'
  ];

  const results: { table: string; status: string; error?: any }[] = [];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      results.push({ table, status: 'Error', error: { code: error.code, message: error.message } });
    } else {
      results.push({ table, status: 'OK' });
    }
  }

  console.log('=== PLATFORM AUDIT RESULTS ===');
  console.table(results);
}

test();
