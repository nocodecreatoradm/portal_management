import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function test() {
  const { data: brand, error: bErr } = await supabase.from('brands').insert([{ name: 'SOLE' }]).select('*').single();
  console.log('Brand created:', brand, bErr);

  const { data: line, error: lErr } = await supabase.from('product_lines').insert([{ name: 'LÍNEA BLANCA' }]).select('*').single();
  console.log('Line created:', line, lErr);

  const { data: supplier, error: sErr } = await supabase.from('suppliers').insert([{ legal_name: 'LOCAL', commercial_alias: 'LOCAL', erp_code: 'LOCAL' }]).select('*').single();
  console.log('Supplier created:', supplier, sErr);
}

test();
