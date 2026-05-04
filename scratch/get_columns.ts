import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

async function test() {
  const res = await fetch(url + '/rest/v1/?apikey=' + key);
  const data = await res.json();
  console.log('OpenAPI Response:', data);
}

test();
