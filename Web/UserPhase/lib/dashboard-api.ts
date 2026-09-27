"use client";
import { apiBase, authToken, clearAuthToken } from "./auth";

/*
  Dashboard data layer.
  Thin, typed wrapper over the real Express API. Every dashboard panel goes
  through here, so auth headers, 401 handling and error normalisation live in
  one place.
*/

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Thrown when there is no session at all — callers send the user to /login. */
export class AuthError extends ApiError {
  constructor(message = "Please log in first.") {
    super(message, 401);
    this.name = "AuthError";
  }
}

/**
 * Calls the API with the stored bearer token. On 401 the token is dropped and
 * an AuthError is raised so the caller (or <DashboardShell>) can redirect once,
 * rather than every panel racing to redirect.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  if (!apiBase) {
    throw new ApiError("API URL is not configured. Set NEXT_PUBLIC_API_URL in .env.local.", 0);
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = authToken();
    if (!token) throw new AuthError();
    headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${apiBase}${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }
  if (res.status === 401 && auth) {
    clearAuthToken();
    throw new AuthError("Session expired. Please log in again.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((body as { error?: string })?.error ?? `Request failed (${res.status})`, res.status);
  }
  return body as T;
}

/* ---------- Types: real response shapes ---------- */

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
};

export type EnrolledCourse = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  enrolled_at: string;
};

export type EnrolledClassroom = {
  id: string;
  title: string;
  slug: string;
  schedule_text: string | null;
  starts_at: string | null;
  enrolled_at: string;
};

export type MyEnrollments = { courses: EnrolledCourse[]; classrooms: EnrolledClassroom[] };

export type Transaction = {
  id: string;
  user_id: string;
  amount_kobo: number;
  currency: string;
  product_type: string;
  product_id: string;
  flutterwave_ref: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
};

export type Notification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

export type Conversation = {
  id: string;
  student_id: string;
  booking_id: string | null;
  subject: string | null;
  unread: number;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export type TrainingRequest = {
  id: string;
  user_id: string;
  topic: string;
  current_level: string | null;
  background: string | null;
  goals: string | null;
  preferred_schedule: string | null;
  preferred_days: string | null;
  preferred_time: string | null;
  mode: string | null;
  audience: string | null;
  budget_kobo: number | null;
  message: string | null;
  status: string;
  converted_classroom_id: string | null;
  created_at: string;
  waiting?: number;
  classroom_slug?: string | null;
  classroom_title?: string | null;
};

export type JoinedRequest = {
  id: string;
  topic: string;
  status: string;
  converted_classroom_id: string | null;
  position: number;
  waiting: number;
  classroom_slug: string | null;
};

export type RequestStatus = { sla_hours: number; mine: TrainingRequest[]; joined: JoinedRequest[] };

export type OpenRequest = {
  id: string;
  topic: string;
  current_level: string | null;
  mode: string | null;
  audience: string | null;
  created_at: string;
  waiting: number;
};

export type Booking = {
  id: string;
  user_id: string;
  topic: string;
  duration_min: number;
  mode: string;
  preferred_date: string | null;
  preferred_time: string | null;
  location: string | null;
  message: string | null;
  status: string;
  livekit_room: string | null;
  created_at: string;
  /** Set by the instructor when a price is agreed; absent until then. */
  price_kobo?: number | null;
};

export type Lesson = {
  id: string;
  title: string;
  position: number;
  duration_sec: number | null;
  video_key?: string | null;
  completed: boolean | null;
};

export type CourseSection = { id: string; title: string; position: number; lessons: Lesson[] | null };

export type CourseLearn = {
  sections: CourseSection[];
  materials: Array<{ id: string; title: string; mime: string | null; size_bytes: number | null; lesson_id: string }>;
  total: number;
  completed: number;
};

export type ClassroomSession = {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  status?: string | null;
  recording_status?: string | null;
};

export type ClassroomWorkspace = {
  sessions: ClassroomSession[];
  materials: Array<{ id: string; title: string; mime: string | null; size_bytes: number | null }>;
  announcements: Array<{ id: string; title: string; body: string | null; created_at: string }>;
  assignments: Array<{ id: string; title: string; due_at: string | null; submitted: number; created_at: string }>;
  recordings: Array<{ id: string; duration_sec: number | null; status: string; session_title: string | null }>;
  messages: Array<{ id: string; body: string; sender_id: string; sender_name: string | null; created_at: string }>;
};

export type CatalogCourse = {
  id: string;
  title: string;
  slug: string;
  level: string | null;
  short_description: string | null;
  price_kobo: number;
  currency: string;
  cover_url: string | null;
  category: string | null;
  category_slug: string | null;
  students: number;
};

export type CatalogClassroom = {
  id: string;
  title: string;
  slug: string;
  level: string | null;
  description: string | null;
  price_kobo: number;
  currency: string;
  capacity: number | null;
  starts_at: string | null;
  ends_at: string | null;
  schedule_text: string | null;
  enrolled: number;
};

export type Category = { id: string; name: string; slug: string };

/* ---------- Endpoints (exact backend paths) ---------- */

export const api = {
  /* auth.ts */
  me: () => apiFetch<Profile>("/auth/me"),

  /* public.ts — logged-in student views */
  myEnrollments: () => apiFetch<MyEnrollments>("/api/enrollments/mine"),
  myTransactions: () => apiFetch<Transaction[]>("/api/transactions/mine"),

  /* public.ts — catalog */
  courses: (params?: { search?: string; category?: string; level?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.category) qs.set("category", params.category);
    if (params?.level) qs.set("level", params.level);
    const s = qs.toString();
    return apiFetch<CatalogCourse[]>(`/api/courses${s ? `?${s}` : ""}`, {}, false);
  },
  classrooms: (params?: { search?: string; level?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.level) qs.set("level", params.level);
    const s = qs.toString();
    return apiFetch<CatalogClassroom[]>(`/api/classrooms${s ? `?${s}` : ""}`, {}, false);
  },
  categories: () => apiFetch<Category[]>("/api/categories", {}, false),
  classroom: (slug: string) => apiFetch<CatalogClassroom & { sessions: ClassroomSession[]; material_count: number }>(`/api/classrooms/${encodeURIComponent(slug)}`, {}, false),
  course: (slug: string) => apiFetch<CatalogCourse & { sections: CourseSection[] }>(`/api/courses/${encodeURIComponent(slug)}`, {}, false),

  /* scope.ts */
  requestStatus: () => apiFetch<RequestStatus>("/scope/requests/status"),
  openRequests: () => apiFetch<OpenRequest[]>("/scope/requests/open", {}, false),
  joinRequest: (id: string) => apiFetch<{ position: number }>(`/scope/requests/${encodeURIComponent(id)}/join`, { method: "POST" }),
  courseLearn: (id: string) => apiFetch<CourseLearn>(`/scope/courses/${encodeURIComponent(id)}/learn`),
  completeLesson: (lessonId: string) => apiFetch<{ completed: boolean }>(`/scope/lessons/${encodeURIComponent(lessonId)}/complete`, { method: "POST" }),
  classroomWorkspace: (id: string) => apiFetch<ClassroomWorkspace>(`/scope/classrooms/${encodeURIComponent(id)}/workspace`),
  sendClassroomMessage: (id: string, body: string) =>
    apiFetch<{ id: string }>(`/scope/classrooms/${encodeURIComponent(id)}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
  submitAssignment: (id: string, body: string) =>
    apiFetch<{ submitted: boolean }>(`/scope/assignments/${encodeURIComponent(id)}/submit`, { method: "POST", body: JSON.stringify({ body }) }),
  booking: (id: string) =>
    apiFetch<{ booking: Booking; conversation: Conversation | null; messages: Message[] }>(`/scope/bookings/${encodeURIComponent(id)}`),
  sendBookingMessage: (id: string, body: string) =>
    apiFetch<Message>(`/scope/bookings/${encodeURIComponent(id)}/messages`, { method: "POST", body: JSON.stringify({ body }) }),

  /* student.ts */
  myRequests: () => apiFetch<TrainingRequest[]>("/requests/mine"),
  createRequest: (payload: Record<string, unknown>) =>
    apiFetch<TrainingRequest>("/requests", { method: "POST", body: JSON.stringify(payload) }),
  myBookings: () => apiFetch<Booking[]>("/bookings/mine"),
  createBooking: (payload: Record<string, unknown>) =>
    apiFetch<Booking>("/bookings", { method: "POST", body: JSON.stringify(payload) }),
  conversations: () => apiFetch<Conversation[]>("/messages/conversations"),
  createConversation: (subject: string) =>
    apiFetch<Conversation>("/messages/conversations", { method: "POST", body: JSON.stringify({ subject }) }),
  conversation: (id: string) => apiFetch<Message[]>(`/messages/conversations/${encodeURIComponent(id)}`),
  sendMessage: (id: string, body: string) =>
    apiFetch<Message>(`/messages/conversations/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ body }) }),
  notifications: () => apiFetch<Notification[]>("/notifications/mine"),

  /* files.ts — authenticated download URL for a private material */
  materialUrl: (id: string) => `${apiBase}/files/${encodeURIComponent(id)}`,

  /* live.ts */
  liveToken: (payload: { classroom_id?: string; booking_id?: string }) =>
    apiFetch<{ url: string; token: string; room: string }>("/live/token", { method: "POST", body: JSON.stringify(payload) }),
};

/** Formatting helper — the API stores minor units (kobo). */
export function money(kobo: number | null | undefined, currency = "NGN"): string {
  const major = (Number(kobo) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(major);
  } catch {
    return `${currency} ${major.toLocaleString()}`;
  }
}
