"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ic, ToastHost } from "./reb-ui";
import type { IconName } from "./icons";
import { adminLogout, initials } from "@/lib/admin";
import { useAdmin } from "@/lib/use-admin";
import { subscribeAdminEvents, type LiveStatus } from "@/lib/live-events";

/*
  Console shell — ported from demo/rebuild-admin.html (rail + grouped nav,
  topbar with ⌘K palette, mobile dock + More sheet), with two jobs the
  reference does not have:

    1. Every badge is real. Inbox unread comes from GET /admin/conversations,
       Requests from GET /admin/requests, the LIVE pill/dot from
       GET /admin/stats — a count that failed to load renders nothing rather
       than a hopeful "0".

    2. The reference's "All services healthy" promo was fixture copy. It now
       shows the actual state of GET /admin/events/stream (the SSE feed this
       console uses to refresh badges), via lib/live-events.ts.

  Legacy screens that are not part of the rebuild (/courses, /courses/[id],
  /users/[id], /notifications) still need console.css's `.ad` scope and its
  `.ad-content` padding, so their children are wrapped in the adapter below;
  rebuilt pages render directly inside `.view`.
*/

type NavItem = { href: string; label: string; icon: IconName; badge?: "unread" | "requests" | "live" };
type NavGroup = { group: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    group: "Operate",
    items: [
      { href: "/", label: "Overview", icon: "grid" },
      { href: "/live", label: "Live control", icon: "radio", badge: "live" },
      { href: "/messages", label: "Inbox", icon: "inbox", badge: "unread" },
      { href: "/requests", label: "Requests", icon: "sparkles", badge: "requests" },
    ],
  },
  {
    group: "Catalog",
    items: [
      { href: "/products", label: "Products", icon: "layers" },
      { href: "/classrooms", label: "Classrooms", icon: "monitorPlay" },
      { href: "/sessions", label: "Sessions", icon: "calendar" },
      { href: "/materials", label: "Media", icon: "fileText" },
    ],
  },
  {
    group: "People",
    items: [
      { href: "/users", label: "Learners", icon: "users" },
      { href: "/bookings", label: "Bookings", icon: "calendarCheck" },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/broadcast", label: "Broadcast", icon: "megaphone" },
      { href: "/recordings", label: "Recordings", icon: "layers" },
      { href: "/reports", label: "Reports", icon: "download" },
      { href: "/transactions", label: "Transactions", icon: "receipt" },
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

const ALL_NAV: NavItem[] = NAV.flatMap((g) => g.items);

/* Mobile dock: reference order (Home, Live, Inbox, Requests, More). */
const DOCK = ALL_NAV.filter((n) => ["/", "/live", "/messages", "/requests"].includes(n.href));

/** Longest-prefix match so /classrooms/<id> keeps "Classrooms" current. */
function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Screens not part of the rebuild: they render inside console.css's `.ad`. */
function isLegacyScreen(pathname: string): boolean {
  if (pathname === "/notifications") return true;
  if (pathname === "/courses" || pathname.startsWith("/courses/")) return true;
  if (/^\/users\/.+/.test(pathname)) return true;
  return false;
}

const STATUS_COPY: Record<LiveStatus, { text: string; tone: string; dot: string }> = {
  idle: { text: "Live feed idle", tone: "warn", dot: "warn" },
  connecting: { text: "Connecting to live feed…", tone: "warn", dot: "warn" },
  connected: { text: "Live feed connected", tone: "ok", dot: "ok" },
  reconnecting: { text: "Live feed reconnecting…", tone: "warn", dot: "warn" },
  polling: { text: "Live feed unreachable — polling", tone: "danger", dot: "danger" },
};

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [railOpen, setRailOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [hydrated, setHydrated] = useState(false);

  /* Counts — one request per list the console already needs. */
  const stats = useAdmin<any>("/admin/stats");
  const conversations = useAdmin<any[]>("/admin/conversations");
  const requests = useAdmin<any[]>("/admin/requests");
  const me = useAdmin<any>("/admin/me");

  const unread = useMemo(() => {
    const rows = Array.isArray(conversations.data) ? conversations.data : [];
    return rows.reduce((n: number, c: any) => n + (Number(c?.unread) || 0), 0);
  }, [conversations.data]);

  const openRequests = useMemo(() => {
    const rows = Array.isArray(requests.data) ? requests.data : [];
    return rows.filter((r: any) => r?.status === "pending" || r?.status === "reviewing").length;
  }, [requests.data]);

  const liveSessions = Number(stats.data?.liveSessions) || 0;

  /* Realtime: the SSE feed drives badge refreshes and the rail status card. */
  useEffect(() => {
    return subscribeAdminEvents(
      (e) => {
        if (e.event === "message" || e.event === "notification" || e.event === "poll") conversations.reload();
        if (e.event === "notification" || e.event === "poll") requests.reload();
        if (e.event === "session" || e.event === "poll") stats.reload();
      },
      setStatus
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Theme restored after mount so the first paint cannot mismatch. */
  useEffect(() => {
    setHydrated(true);
    setTheme((localStorage.getItem("ferix_admin_theme") as "dark" | "light") ?? "dark");
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("ferix_admin_theme", theme);
  }, [theme, hydrated]);

  const closeAll = useCallback(() => {
    setRailOpen(false);
    setSheetOpen(false);
    setPalette(false);
  }, []);

  /* ⌘K / Ctrl+K / "/" open the palette; Esc closes everything. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName ?? "");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (e.key === "Escape") {
        closeAll();
        return;
      }
      if (!typing && e.key === "/") {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAll]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_NAV.filter((n) => !q || n.label.toLowerCase().includes(q) || n.href.includes(q));
  }, [query]);
  useEffect(() => setCursor(0), [query]);

  const go = (href: string) => {
    closeAll();
    window.location.href = href;
  };

  const onPaletteKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      go(results[cursor].href);
    }
  };

  const badgeFor = (item: NavItem) => {
    if (item.badge === "unread") return unread > 0 ? <span className="cnt alert">{unread}</span> : null;
    if (item.badge === "requests") return openRequests > 0 ? <span className="cnt">{openRequests}</span> : null;
    if (item.badge === "live") return liveSessions > 0 ? <span className="cnt alert" aria-label="Live now">●</span> : null;
    return null;
  };

  const navLink = (item: NavItem, onNavigate?: () => void) => {
    const current = isCurrent(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={current ? "on" : undefined}
        aria-current={current ? "page" : undefined}
        onClick={onNavigate}
      >
        <Ic name={item.icon} />
        <span className="t">{item.label}</span>
        {badgeFor(item)}
      </Link>
    );
  };

  const displayName = me.data?.full_name || me.data?.email || "Admin";
  const statusInfo = STATUS_COPY[status];

  const content = isLegacyScreen(pathname) ? (
    <div className="ad" data-theme={theme} style={{ minHeight: "100%" }}>
      <div className="ad-content" tabIndex={-1}>
        <div className="ad-content-inner">{children}</div>
      </div>
    </div>
  ) : (
    children
  );

  return (
    <div className="reb" data-theme={hydrated ? theme : "dark"}>
      <div className="app">
        {/* ---------- rail ---------- */}
        <aside className={`rail${railOpen ? " open" : ""}`} aria-label="Console sections">
          <Link className="brand" href="/" onClick={() => setRailOpen(false)}>
            <span className="brand-mark">FC</span>
            <span>
              <b>FerixCourse</b>
              <small>Operations console</small>
            </span>
          </Link>
          <nav className="nav">
            {NAV.map((g) => (
              <div key={g.group}>
                <p className="nav-label">{g.group}</p>
                {g.items.map((item) => navLink(item, () => setRailOpen(false)))}
              </div>
            ))}
          </nav>
          <div className="promo">
            <h4>System status</h4>
            <p>API · admin event stream</p>
            <span className={`dot-status ${statusInfo.dot}`}>
              <i /> {statusInfo.text}
            </span>
          </div>
        </aside>
        <div className={`scrim${railOpen ? " on" : ""}`} onClick={() => setRailOpen(false)} aria-hidden="true" />

        {/* ---------- column ---------- */}
        <div className="col">
          <header className="topbar">
            <button className="icon-btn only-m" onClick={() => setRailOpen(true)} aria-label="Open navigation">
              <Ic name="menu" />
            </button>
            <button className="search-trig" onClick={() => setPalette(true)} aria-label="Search pages">
              <Ic name="search" size={16} />
              <span>Search pages, learners, classrooms…</span>
              <kbd>⌘K</kbd>
            </button>
            <div className="tb-actions">
              {liveSessions > 0 ? (
                <Link className="live-pill" href="/live" title="A training is streaming right now">
                  <i />
                  LIVE
                </Link>
              ) : null}
              <button
                className="icon-btn"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              >
                <Ic name={theme === "dark" ? "sun" : "moon"} />
              </button>
              <button
                className="icon-btn"
                onClick={() => {
                  adminLogout();
                  window.location.href = "/login";
                }}
                aria-label="Log out"
              >
                <Ic name="logOut" />
              </button>
              <Link className="icon-btn" href="/messages" aria-label={unread ? `Messages, ${unread} unread` : "Messages"}>
                <Ic name="inbox" />
                {unread > 0 ? <span className="dot" /> : null}
              </Link>
              <Link className="avatar" href="/settings" title={displayName}>
                {initials(displayName)}
              </Link>
            </div>
          </header>

          <main className="view" id="ad-main" tabIndex={-1}>
            {content}
          </main>

          <nav className="dock" aria-label="Primary">
            {DOCK.map((item) => {
              const current = isCurrent(pathname, item.href);
              const cnt = item.badge === "unread" ? unread : item.badge === "requests" ? openRequests : 0;
              return (
                <Link key={item.href} href={item.href} className={current ? "on" : undefined}>
                  <Ic name={item.icon} size={19} />
                  {item.label}
                  {cnt > 0 ? <span className="cnt">{cnt}</span> : null}
                </Link>
              );
            })}
            <button onClick={() => setSheetOpen(true)} aria-label="More destinations">
              <Ic name="moreVertical" size={19} />
              More
            </button>
          </nav>
        </div>

        {/* ---------- mobile more sheet ---------- */}
        <div className={`sheet-scrim${sheetOpen ? " on" : ""}`} onClick={() => setSheetOpen(false)} aria-hidden="true" />
        <div className={`more-sheet${sheetOpen ? " on" : ""}`} role="dialog" aria-label="More destinations" aria-hidden={!sheetOpen}>
          <div className="handle" />
          <h4>More</h4>
          <div className="mrow2">
            {ALL_NAV.filter((n) => !DOCK.includes(n)).map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setSheetOpen(false)}>
                <Ic name={item.icon} />
                {item.label}
                {item.badge === "unread" && unread > 0 ? <span className="cnt">{unread}</span> : null}
                {item.badge === "requests" && openRequests > 0 ? <span className="cnt">{openRequests}</span> : null}
              </Link>
            ))}
          </div>
        </div>

        {/* ---------- palette ---------- */}
        <div
          className={`palette-wrap${palette ? " on" : ""}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPalette(false);
          }}
        >
          <div className="palette" role="dialog" aria-label="Search">
            <div className="pin">
              <Ic name="search" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onPaletteKey}
                placeholder="Jump to a page…"
                aria-label="Search pages"
              />
            </div>
            <div className="plist">
              {results.length ? (
                results.map((r, i) => (
                  <button key={r.href} className={i === cursor ? "on" : undefined} onClick={() => go(r.href)}>
                    <Ic name={r.icon} size={16} />
                    <span>{r.label}</span>
                    <span className="kind">Page</span>
                  </button>
                ))
              ) : (
                <p style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>No matches.</p>
              )}
            </div>
            <div className="pfoot">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span>Esc close</span>
            </div>
          </div>
        </div>

        {/* ---------- account / theme ---------- */}
        <ToastHost />
      </div>
    </div>
  );
}
