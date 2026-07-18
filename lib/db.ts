import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY database client (service-role key, bypasses RLS).
// Only import from server components and route handlers — never from a file
// marked "use client", or the key could be bundled into the browser.
// RLS is enabled with no policies, so the public anon key can't read anything.
//
// cache: "no-store" is load-bearing: Next.js patches global fetch and caches
// GET responses in its Data Cache ACROSS requests in production — even on
// force-dynamic routes. Without this, pages render stale rows (e.g. a status
// change saves to the DB but the next render shows the old value).
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
