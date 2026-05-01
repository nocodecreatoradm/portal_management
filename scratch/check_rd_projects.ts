import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function test() {
  const r1 = await supabase.from('rd_project_templates').select('*');
  console.log('Templates in DB err/data:', r1.error, r1.data);

  const r2 = await supabase.from('rd_custom_projects').select('*');
  console.log('Projects in DB err/data:', r2.error, r2.data);
}

test();
