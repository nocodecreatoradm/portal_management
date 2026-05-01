import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function test() {
  console.log('Fetching policies from pg_policies...');
  const { data, error } = await supabase.rpc('get_policies');
  if (error) {
    console.log('Error calling get_policies RPC, trying direct SQL via query:');
    // Supabase has REST API but not a direct arbitrary query runner unless we use RPC
    // Let's try to query info schema or system tables using a view or similar
    // BUT since we don't have custom SQL runner RPC, let's look at the error we got in the previous script.
  } else {
    console.log('Policies:', data);
  }

  // Let's test if we can insert via a different role or see what authenticated users can do
  // Wait, let's find out if there's any other RLS policy on other tables
  const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles fetched:', profileData || profileError);
}

test();
