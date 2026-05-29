import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function check() {
  try {
    const { data, error } = await supabase
      .from('canton_fair_suppliers')
      .select('name, catalogues, agreements, quotations')
      .limit(5);

    if (error) throw error;

    console.log("Canton Fair Suppliers catalog data from Supabase:");
    for (const row of data || []) {
      console.log(`Supplier: ${row.name}`);
      console.log(`Catalogues:`, JSON.stringify(row.catalogues));
      console.log(`Agreements:`, JSON.stringify(row.agreements));
      console.log(`Quotations:`, JSON.stringify(row.quotations));
      console.log("------------------------");
    }
  } catch (e) {
    console.error("Error reading Supabase:", e);
  }
}

check();
