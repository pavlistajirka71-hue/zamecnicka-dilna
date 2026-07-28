import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in dev if .env.local is missing — see README.md for setup.
  console.warn(
    "Chybí NEXT_PUBLIC_SUPABASE_URL nebo NEXT_PUBLIC_SUPABASE_ANON_KEY. Zkopíruj .env.local.example do .env.local a vyplň hodnoty z Supabase projektu."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
