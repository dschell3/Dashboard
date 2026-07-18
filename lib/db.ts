import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

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

// Bulk upsert that first groups rows by key signature. PostgREST bulk writes
// use the UNION of keys across the payload and null-fill rows that lack one —
// so a batch mixing shapes (e.g. some rows carrying deadline_at, some
// deliberately omitting it to preserve user-set values) would null out the
// omitted columns on the rows that left them off. Uniform-shape batches make
// "omitted column" actually mean "left untouched".
export async function upsertGrouped(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, any>[],
  onConflict: string
) {
  const groups = new Map<string, Record<string, any>[]>();
  for (const r of rows) {
    const key = Object.keys(r).sort().join(",");
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }
  for (const group of Array.from(groups.values())) {
    for (let i = 0; i < group.length; i += 500) {
      const { error } = await supabase.from(table).upsert(group.slice(i, i + 500), { onConflict });
      if (error) throw error;
    }
  }
}
