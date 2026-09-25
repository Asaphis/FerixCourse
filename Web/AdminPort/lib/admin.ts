import { createClient } from "@supabase/supabase-js";

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let _sb: ReturnType<typeof createClient> | null = null;
export function supabase() {
  if (!_sb) {
    _sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
    );
  }
  return _sb;
}

export async function adminFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not logged in. Please log in as admin.");
  const r = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error ?? `Request failed (${r.status})`);
  return body;
}
