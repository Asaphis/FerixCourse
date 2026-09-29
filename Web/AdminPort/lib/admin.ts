/*
  Admin console data layer.

  Backend-owned admin sessions. The JWT lives in sessionStorage (not
  localStorage) so closing the tab ends the console session — this is the
  higher-privilege surface and it should not linger.

  Every call goes through adminFetch, so bearer auth, 401 handling and error
  normalisation (including the 409 "this has learners attached" confirmation
  used by the destructive endpoints) live in exactly one place.
*/

export const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

const KEY = "ferix_admin_token";

/** An API failure that preserves the HTTP status and any structured body. */
export class AdminApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(message: string, status: number, body: Record<string, unknown> = {}) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.body = body;
  }
}

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
  /* The console refuses a session it cannot use, rather than logging in and
     then failing every request with 403. */
  if (data.user?.role !== "ADMIN") throw new Error("This account is not an admin.");
  window.sessionStorage.setItem(KEY, data.token);
  return data.user as { id: string; email: string; full_name: string | null; role: string };
}

export function adminLogout() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(KEY);
}

/** Redirect to the login screen once, clearing the dead token first. */
function handleAuthFailure() {
  if (typeof window === "undefined") return;
  adminLogout();
  if (window.location.pathname !== "/login") window.location.href = "/login";
}

export async function adminFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = adminToken();
  if (!token) throw new AdminApiError("Not logged in. Please log in as admin.", 401);
  if (!apiUrl) throw new AdminApiError("API URL is not configured.", 0);

  let r: Response;
  try {
    r = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new AdminApiError("Could not reach the API. Check the connection and try again.", 0);
  }

  if (r.status === 401) {
    handleAuthFailure();
    throw new AdminApiError("Session expired. Please log in again.", 401);
  }

  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new AdminApiError(body?.error ?? `Request failed (${r.status})`, r.status, body ?? {});
  }
  return body as T;
}

/* ---------- shared shape helpers ---------- */

/** Formatting helper — the API stores minor units (kobo). */
export function money(kobo: number | null | undefined, currency = "NGN"): string {
  const major = (Number(kobo) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${currency} ${major.toLocaleString()}`;
  }
}

export function shortDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(iso);
}

export function initials(name: string | null | undefined): string {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function bytes(n: number | null | undefined): string {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1048576) return `${(v / 1024).toFixed(0)} KB`;
  return `${(v / 1048576).toFixed(1)} MB`;
}

/** Turn "My Great Course" into a URL-safe slug suggestion. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function durationMin(sec: number | null | undefined): string {
  const m = Math.round((Number(sec) || 0) / 60);
  return m < 1 ? "< 1 min" : `${m} min`;
}

/* ==========================================================================
   Rebuild helpers � thin, typed wrappers over the same adminFetch.

   Everything here is a real endpoint from Backend/src/routes/*.ts; nothing is
   simulated. `post/patch/del` only exist so pages read as intent rather than
   RequestInit plumbing � the token, 401 handling and error normalisation are
   still adminFetch's job alone.
   ========================================================================== */

import type {
  BroadcastAudience,
  BroadcastRow,
  CategoryRow,
  ClassroomMessageRow,
  ConversationRow,
  Health,
  MessageRow,
  ProductInput,
  ProductRow,
  ReportsData,
} from "./admin-types";

export async function post<T = any>(path: string, body: unknown): Promise<T> {
  return adminFetch<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
}

export async function patch<T = any>(path: string, body: unknown): Promise<T> {
  return adminFetch<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) });
}

export async function put<T = any>(path: string, body: unknown): Promise<T> {
  return adminFetch<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) });
}

export async function del<T = any>(path: string): Promise<T> {
  return adminFetch<T>(path, { method: "DELETE" });
}

/**
 * Multipart upload to any endpoint (POST /admin/uploads, POST /messages/uploads,
 * field name "file"). Deliberately NOT through adminFetch: that always sets
 * Content-Type: application/json, which would strip the multipart boundary and
 * the server would see no file at all.
 */
export async function adminUpload<T = any>(path: string, file: File, field = "file"): Promise<T> {
  const token = adminToken();
  if (!token) throw new AdminApiError("Not logged in. Please log in as admin.", 401);
  if (!apiUrl) throw new AdminApiError("API URL is not configured.", 0);

  const form = new FormData();
  form.append(field, file);

  let r: Response;
  try {
    r = await fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new AdminApiError("Could not reach the API while uploading.", 0);
  }
  if (r.status === 401) {
    handleAuthFailure();
    throw new AdminApiError("Session expired. Please log in again.", 401);
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 503) {
      throw new AdminApiError("File storage is not configured on the server (R2 credentials missing).", 503);
    }
    if (r.status === 413) throw new AdminApiError("That file is larger than the upload limit.", 413);
    throw new AdminApiError(body?.error ?? "Upload failed.", r.status, body ?? {});
  }
  return body as T;
}

/**
 * Resolve a file endpoint such as `/files/message/<id>` to a signed URL.
 * Every /files route requires the bearer token, so a plain <a href> can never
 * open one � the JSON step has to happen first.
 */
export async function fileSignedUrl(path: string): Promise<string> {
  const res = await adminFetch<{ url: string; expires_in: number }>(path);
  return res.url;
}

/** GET /health � the one honest liveness signal the backend exposes. */
export function apiHealth(): Promise<Health> {
  if (!apiUrl) return Promise.reject(new AdminApiError("API URL is not configured.", 0));
  return fetch(`${apiUrl}/health`).then((r) => r.json());
}

/* ---------- products & categories ---------- */

export const getProducts = () => adminFetch<ProductRow[]>("/admin/products");
export const createProduct = (body: ProductInput) => post<ProductRow>("/admin/products", body);

export const getCategories = () => adminFetch<CategoryRow[]>("/admin/categories");
export const createCategory = (body: { name: string; slug?: string }) => post<CategoryRow>("/admin/categories", body);
export const updateCategory = (id: string, body: { name?: string; slug?: string }) =>
  patch<CategoryRow>(`/admin/categories/${id}`, body);
export const deleteCategory = (id: string) => del<{ ok: boolean }>(`/admin/categories/${id}`);

/* ---------- broadcast & reports ---------- */

export const sendBroadcast = (body: { title: string; body: string; audience: BroadcastAudience }) =>
  post<{ id: string; sent: number; broadcast: BroadcastRow }>("/admin/broadcast", body);
export const getBroadcasts = () => adminFetch<BroadcastRow[]>("/admin/broadcasts");
export const getReports = () => adminFetch<ReportsData>("/admin/reports");

/* ---------- conversations (inbox) ---------- */

export const getConversations = () => adminFetch<ConversationRow[]>("/admin/conversations");
export const getThread = (id: string) => adminFetch<MessageRow[]>(`/admin/conversations/${id}`);
export const replyToConversation = (
  id: string,
  body: { body: string; parent_id?: string | null; attachment?: { key: string; name: string; kind: string } | null }
) => post<MessageRow>(`/admin/conversations/${id}`, body);
export const markThreadRead = (id: string) => post<{ ok: boolean; read: number }>(`/admin/conversations/${id}/read`, {});
export const uploadMessageFile = (file: File) => adminUpload<{ key: string; name: string; kind: string; size: number }>("/messages/uploads", file);

/* ---------- classroom discussion ---------- */

export const getClassroomMessages = (classroomId: string) =>
  adminFetch<ClassroomMessageRow[]>(`/admin/classrooms/${classroomId}/messages`);
export const postClassroomMessage = (
  classroomId: string,
  body: { body: string; parent_id?: string | null; is_issue?: boolean; attachment?: { key: string; name: string; kind: string } | null; notify?: boolean }
) => post<ClassroomMessageRow & { notified?: number }>(`/admin/classrooms/${classroomId}/messages`, body);
export const solveClassroomMessage = (classroomId: string, mid: string, is_solved: boolean) =>
  patch<ClassroomMessageRow>(`/admin/classrooms/${classroomId}/messages/${mid}`, { is_solved });

/* ---------- live control room ---------- */

export type LiveOverviewData = {
  sessions: Array<{
    id: string;
    title: string;
    starts_at: string | null;
    status: "scheduled" | "live" | "ended";
    recording_status: string;
    livekit_room: string;
    classroom_id: string | null;
    classroom_title: string | null;
    classroom_slug: string | null;
    members: number;
    attended: number;
  }>;
  classrooms: Array<{ id: string; title: string; livekit_room: string; is_published: boolean; members: number }>;
};

export const getLiveOverview = () => adminFetch<LiveOverviewData>("/admin/live/overview");
export const goLive = (sessionId: string) => patch(`/admin/sessions/${sessionId}`, { status: "live" });
export const endSession = (sessionId: string) => patch(`/admin/sessions/${sessionId}`, { status: "ended" });
export const createSession = (body: { classroom_id: string; title: string; starts_at?: string | null; ends_at?: string | null }) =>
  post<{ id: string }>("/admin/sessions", body);
export const getAttendance = (sessionId: string) =>
  adminFetch<Array<{ joined_at: string; user_id: string; full_name: string | null; email: string | null }>>(
    `/admin/sessions/${sessionId}/attendance`
  );
export const startRecording = (sessionId: string) =>
  post<{ egress_id: string; storage_key: string }>(`/admin/sessions/${sessionId}/recording/start`, {});
export const stopRecording = (sessionId: string) => post<{ ok: boolean }>(`/admin/sessions/${sessionId}/recording/stop`, {});
/* POST /live/token takes { classroom_id } (or booking_id) — one room per
   classroom, membership-checked. */
export const liveToken = (body: { classroom_id?: string; booking_id?: string }) =>
  post<{ url: string; token: string; room: string }>("/live/token", body);

/* ---------- settings ---------- */

export const updateSetting = (key: string, value: unknown) => put(`/admin/settings/${key}`, { value });
