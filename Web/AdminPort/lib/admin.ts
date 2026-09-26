// Backend-owned admin sessions (JWT in sessionStorage — admin logins don't linger).
export const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
const KEY = "ferix_admin_token";

export function adminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(KEY);
}

export async function adminLogin(email: string, password: string) {
  if (!apiUrl) throw new Error("API URL is not configured.");
  const r = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error ?? "Login failed.");
  if (data.user?.role !== "ADMIN") throw new Error("This account is not an admin.");
  window.sessionStorage.setItem(KEY, data.token);
  return data.user;
}

export function adminLogout() {
  window.sessionStorage.removeItem(KEY);
}

export async function adminFetch(path: string, init: RequestInit = {}) {
  const token = adminToken();
  if (!token) throw new Error("Not logged in. Please log in as admin.");
  const r = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  if (r.status === 401 && typeof window !== "undefined") {
    adminLogout();
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error ?? `Request failed (${r.status})`);
  return body;
}
