// Backend-owned auth (JWT in localStorage). No Supabase anywhere.
export const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const KEY = "ferix_token";

export function apiConfigured() {
  return Boolean(apiBase);
}

export function authToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setAuthToken(t: string) {
  window.localStorage.setItem(KEY, t);
}

export function clearAuthToken() {
  window.localStorage.removeItem(KEY);
}

async function post(path: string, body: any) {
  if (!apiBase) throw new Error("API URL is not configured. Set NEXT_PUBLIC_API_URL in .env.local.");
  const r = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error ?? `Request failed (${r.status})`);
  return data;
}

export async function apiRegister(full_name: string, email: string, password: string) {
  return post("/auth/register", { full_name, email, password }) as Promise<{ needs_verification: boolean; hint?: string }>;
}

export async function apiResend(email: string) {
  return post("/auth/verify-resend", { email });
}

export async function apiLogin(email: string, password: string) {
  const d = (await post("/auth/login", { email, password })) as { token: string; user: any };
  setAuthToken(d.token);
  return d;
}

export async function apiForgot(email: string) {
  return post("/auth/forgot", { email });
}

export async function apiReset(token: string, password: string) {
  return post("/auth/reset", { token, password });
}

export async function apiMe() {
  const t = authToken();
  if (!t) return null;
  const r = await fetch(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
  if (!r.ok) {
    if (r.status === 401) clearAuthToken();
    return null;
  }
  return (await r.json()) as any;
}

export function apiLogout() {
  clearAuthToken();
}
