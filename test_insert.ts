import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function test() {
  console.log('Testing full discovered mapping...');
  const testObj: any = {
    mt_code: 'TEST_' + Date.now(),
    description: 'Test record via discovered columns',
    letter: 'A',
    ee_percentage: '50%',
    ocp: 'OCP_TEST',
    supplier_id: null,
    emission_date: '2026-05-01',
    vigilance_date: '2026-05-01',
    product_type: 'Test type',
    sample_id: null,
    certificate_file: { name: 'cert.pdf', url: 'https://test.com' },
    certificate_history: [],
    label_file: { name: 'label.png', url: 'https://test.com' },
    label_history: [],
    gallery: []
  };

  const { data, error } = await supabase
    .from('energy_efficiency_records')
    .insert([testObj])
    .select();

  console.log('Result:', data, error);
}

test();

















