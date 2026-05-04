import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function test() {
  console.log('Testing NTP regulation insertion...');
  const testObj: any = {
    code: 'NTP 111.011-2014',
    title: 'GAS NATURAL SECO. Sistema de tuberías para instalaciones internas residenciales y comerciales',
    category: 'Gas Natural',
    upload_date: '2018-12-07T16:25:00Z',
    file_info: { name: 'NTP_111.011_2014.pdf', url: '#', type: 'application/pdf' },
    description: 'Sistema de tuberías para instalaciones internas residenciales y comerciales.'
  };

  const { data, error } = await supabase
    .from('ntp_regulations')
    .insert([testObj])
    .select();

  console.log('Result:', data, error);
}

test();
