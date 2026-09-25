"use client";
import { supabase } from "./supabase";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function apiFetch(path: string, init: RequestInit = {}, auth = true) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Please log in first.");
    headers.Authorization = `Bearer ${token}`;
  }
  const r = await fetch(`${apiUrl}${path}`, { ...init, headers: { ...headers, ...(init.headers as any) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error ?? `Request failed (${r.status})`);
  return body;
}

export async function currentUser() {
  const { data } = await supabase().auth.getSession();
  return data.session?.user ?? null;
}
