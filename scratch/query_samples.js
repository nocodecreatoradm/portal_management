const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env file.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  try {
    const { data: samples, error } = await supabase
      .from('samples')
      .select('id, correlative_id, descripcion_sap, created_at');
    
    if (error) {
      console.error('Error querying samples:', error);
      return;
    }

    console.log(`Total samples in database: ${samples.length}`);
    samples.forEach(s => {
      console.log(`- ID: ${s.id}, Correlative: ${s.correlative_id}, SAP: ${s.descripcion_sap}`);
    });
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
