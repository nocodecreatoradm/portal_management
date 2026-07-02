import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function check() {
  console.log('Querying user profiles...');
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .order('full_name');

  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles list:');
    profiles.forEach(p => {
      console.log(`- Name: ${p.full_name} | Email: ${p.email} | Role: ${p.role}`);
    });
  }
}

check();
