const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function check() {
  console.log('Querying profiles...');
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'timmy@greaidea.com');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Profiles found:', JSON.stringify(profiles, null, 2));
}

check();
