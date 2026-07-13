import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY database client (service-role key, bypasses RLS).
// Only import from server components and route handlers — never from a file
// marked "use client", or the key could be bundled into the browser.
// RLS is enabled with no policies, so the public anon key can't read anything.
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(url, serviceKey, { auth: { persistSession: false } });
}
