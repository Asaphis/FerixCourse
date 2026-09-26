"use client";
import { apiBase, authToken, clearAuthToken, apiMe } from "./auth";

export async function apiFetch(path: string, init: RequestInit = {}, auth = true) {
  if (!apiBase) throw new Error("API URL is not configured. Set NEXT_PUBLIC_API_URL in .env.local.");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = authToken();
    if (!token) {
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Please log in first.");
    }
    headers.Authorization = `Bearer ${token}`;
  }
  const r = await fetch(`${apiBase}${path}`, { ...init, headers: { ...headers, ...(init.headers as any) } });
  if (r.status === 401 && auth && typeof window !== "undefined") {
    clearAuthToken();
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?next=${next}`;
    throw new Error("Session expired. Please log in again.");
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error ?? `Request failed (${r.status})`);
  return body;
}

export async function currentUser() {
  return apiMe();
}
