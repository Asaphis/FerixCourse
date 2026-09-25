import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Lazily created so landing renders even before keys are set.
let _client: ReturnType<typeof createClient> | null = null;
export function supabase() {
  if (!_client) {
    if (!url || !anon) throw new Error("Supabase keys missing. Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
    _client = createClient(url, anon);
  }
  return _client;
}

export function isSupabaseConfigured() {
  return Boolean(url && anon);
}
