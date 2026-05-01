import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function test() {
  console.log('Testing Supabase query...');
  
  // 1. Get products to see schema and existing data
  const { data: products, error: prodErr } = await supabase.from('products').select('*').limit(1);
  if (prodErr) {
    console.error('Error fetching products:', prodErr);
  } else {
    console.log('Products sample data:', products);
  }

  // 2. Try inserting a test product
  const testProduct = {
    sap_code: 'TEST_' + Date.now(),
    ean_code: '1234567890',
    sap_description: 'Test Product via Script',
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('products')
    .insert([testProduct])
    .select();

  if (insertErr) {
    console.error('Error inserting product:', insertErr);
  } else {
    console.log('Successfully inserted product:', inserted);
  }
}

test();
