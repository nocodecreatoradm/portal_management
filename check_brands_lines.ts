import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function test() {
  console.log('Fetching database tables...');

  const { data: brands, error: bError } = await supabase.from('brands').select('*');
  console.log('Brands:', brands || bError);

  const { data: productLines, error: lError } = await supabase.from('product_lines').select('*');
  console.log('Product Lines:', productLines || lError);

  const { data: suppliers, error: sError } = await supabase.from('suppliers').select('*').limit(5);
  console.log('Suppliers (up to 5):', suppliers || sError);
}

test();
