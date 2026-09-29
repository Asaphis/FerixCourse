"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  AuthError,
  type Booking,
  type ClassroomMessage,
  type Conversation,
  type EnrolledClassroom,
  type EnrolledCourse,
  type Message,
  type Notification,
  type Profile,
  type RequestStatus,
  type Transaction,
} from "@/lib/dashboard-api";
import { useLiveStream, type LiveStatus } from "@/lib/live-events";

/*
  One fetch for everything the shell and the overview need.
  The rail shows live counts on every page, so the data that drives them is
  fetched once here and shared, instead of each page re-requesting the same
  endpoints. Every value comes from a real endpoint.
*/

export type ShellData = {
  profile: Profile | null;
  courses: EnrolledCourse[];
  classrooms: EnrolledClassroom[];
  notifications: Notification[];
  conversations: Conversation[];
  requests: RequestStatus;
  bookings: Booking[];
  transactions: Transaction[];
};

/* ---------- Realtime events pushed down from the SSE stream ---------- */

export type LiveMessageEvent = { conversation_id: string; message: Message; at: number };
export type LiveTypingEvent = { conversation_id: string; user_id: string; at: number };
export type LiveClassroomEvent = { classroom_id: string; message: ClassroomMessage; at: number };
export type LiveSessionEvent = { session_id: string; classroom_id: string; status: string; at: number };

type DashboardContextValue = {
  data: ShellData | null;
  loading: boolean;
  /** True when there is no valid session. Shells render a public variant. */
  publicMode: boolean;
  /**
   * True when the backend refused every call for a reason other than
   * authentication (network, 500). The UI then shows a retry instead of an
   * empty state, so an outage is never mistaken for "you have no data".
   */
  outage: boolean;
  /** Per-endpoint failures, keyed by a human label. Empty when all succeeded. */
  failures: string[];
  reload: () => void;
  setNotifications: (next: Notification[]) => void;
  setConversations: (next: Conversation[]) => void;
  unreadNotifications: number;
  unreadMessages: number;
  pendingRequests: number;
  upcomingBookings: number;
  /** SSE connection state (connected / reconnecting / polling / …). */
  liveStatus: LiveStatus;
  /** Latest realtime events — pages read + reset them (at = Date.now()). */
  liveMessage: LiveMessageEvent | null;
  liveTyping: LiveTypingEvent | null;
  liveClassroom: LiveClassroomEvent | null;
  liveSession: LiveSessionEvent | null;
  clearLiveMessage: () => void;
};

const EMPTY_REQUESTS: RequestStatus = { sla_hours: 48, mine: [], joined: [] };

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  children,
  requireAuth = true,
}: {
  children: React.ReactNode;
  /** Set false on screens that are also reachable while logged out. */
  requireAuth?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<ShellData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState<string[]>([]);
  const [publicMode, setPublicMode] = useState(false);
  const [outage, setOutage] = useState(false);
  const [nonce, setNonce] = useState(0);
  const redirecting = useRef(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const call = <T,>(label: string, p: Promise<T>): Promise<T | null> =>
      p.catch((e: unknown) => {
        if (e instanceof AuthError) throw e;
        if (alive) setFailures((f) => (f.includes(label) ? f : [...f, label]));
        return null;
      });

    (async () => {
      try {
        const [profile, enrollments, notifications, conversations, requests, bookings, transactions] = await Promise.all([
          api.me(),
          call("enrollments", api.myEnrollments()),
          call("notifications", api.notifications()),
          call("messages", api.conversations()),
          call("requests", api.requestStatus()),
          call("bookings", api.myBookings()),
          call("transactions", api.myTransactions()),
        ]);
        if (!alive) return;
        setData({
          profile,
          courses: enrollments?.courses ?? [],
          classrooms: enrollments?.classrooms ?? [],
          notifications: notifications ?? [],
          conversations: conversations ?? [],
          requests: requests ?? EMPTY_REQUESTS,
          bookings: bookings ?? [],
          transactions: transactions ?? [],
        });
      } catch (e: unknown) {
        if (!alive) return;
        if (e instanceof AuthError) {
          if (requireAuth) {
            // Send to login exactly once, even though several panels may 401.
            if (!redirecting.current) {
              redirecting.current = true;
              const next = encodeURIComponent(window.location.pathname);
              router.replace(`/login?next=${next}`);
            }
          } else {
            // Catalog-style screens stay usable while logged out.
            setPublicMode(true);
          }
          return;
        }
        setOutage(true);
        setFailures(["dashboard"]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, nonce, requireAuth]);

  const reload = useCallback(() => {
    setFailures([]);
    setOutage(false);
    setNonce((n) => n + 1);
  }, []);

  const setNotifications = useCallback((next: Notification[]) => {
    setData((d) => (d ? { ...d, notifications: next } : d));
  }, []);

  const setConversations = useCallback((next: Conversation[]) => {
    setData((d) => (d ? { ...d, conversations: next } : d));
  }, []);

  /* ---------- Realtime: one SSE stream for the whole shell ---------- */

  const [liveStatus, setLiveStatus] = useState<LiveStatus>("idle");
  const [liveMessage, setLiveMessage] = useState<LiveMessageEvent | null>(null);
  const [liveTyping, setLiveTyping] = useState<LiveTypingEvent | null>(null);
  const [liveClassroom, setLiveClassroom] = useState<LiveClassroomEvent | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSessionEvent | null>(null);
  const clearLiveMessage = useCallback(() => setLiveMessage(null), []);

  const liveStatusRef = useRef<LiveStatus>("idle");
  liveStatusRef.current = liveStatus;

  const live = useLiveStream(
    {
      message: (p) => {
        setLiveMessage({ ...p, at: Date.now() });
        setData((d) => {
          if (!d) return d;
          const i = d.conversations.findIndex((c) => c.id === p.conversation_id);
          if (i === -1) return d; // unknown conversation — the next refresh adds it
          const list = [...d.conversations];
          const prev = list[i];
          const mine = p.message.sender_id === d.profile?.id;
          list[i] = {
            ...prev,
            last_body: p.message.body,
            last_at: p.message.created_at,
            unread: mine ? Number(prev.unread) || 0 : (Number(prev.unread) || 0) + 1,
          };
          list.sort((a, b) =>
            Date.parse(b.last_at || b.updated_at) - Date.parse(a.last_at || a.updated_at)
          );
          return { ...d, conversations: list };
        });
      },
      notification: (p) => {
        setData((d) =>
          d && !d.notifications.some((n) => n.id === p.notification.id)
            ? { ...d, notifications: [p.notification, ...d.notifications].slice(0, 50) }
            : d
        );
      },
      typing: (p) => setLiveTyping({ ...p, at: Date.now() }),
      "classroom-message": (p) => setLiveClassroom({ ...p, at: Date.now() }),
      session: (p) => setLiveSession({ ...p, at: Date.now() }),
    },
    {
      enabled: !publicMode && !!data?.profile,
      /* Light polling fallback while the socket is down: refresh the two
         badge-driving lists so counts stay honest without realtime. */
      onPoll: () => {
        if (liveStatusRef.current === "connected") return;
        api.conversations().then(setConversations).catch(() => undefined);
        api.notifications().then(setNotifications).catch(() => undefined);
      },
    }
  );
  useEffect(() => setLiveStatus(live), [live]);

  const unreadNotifications = useMemo(
    () => (data?.notifications ?? []).filter((n) => !n.is_read).length,
    [data?.notifications]
  );
  const unreadMessages = useMemo(
    () => (data?.conversations ?? []).reduce((n, c) => n + (Number(c.unread) || 0), 0),
    [data?.conversations]
  );
  const pendingRequests = useMemo(
    () => (data?.requests.mine ?? []).filter((r) => ["pending", "reviewing"].includes(r.status)).length,
    [data?.requests.mine]
  );
  const upcomingBookings = useMemo(
    () => (data?.bookings ?? []).filter((b) => ["pending", "confirmed", "paid"].includes(b.status)).length,
    [data?.bookings]
  );

  const value: DashboardContextValue = {
    data,
    loading,
    publicMode,
    outage,
    failures,
    reload,
    setNotifications,
    setConversations,
    unreadNotifications,
    unreadMessages,
    pendingRequests,
    upcomingBookings,
    liveStatus,
    liveMessage,
    liveTyping,
    liveClassroom,
    liveSession,
    clearLiveMessage,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
  return ctx;
}
