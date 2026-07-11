import { createClient } from "@supabase/supabase-js";

// Used only inside app/api/* route handlers (server runtime). Never import this from
// a "use client" component — the service role key must never reach the browser.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY na serveru.");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
