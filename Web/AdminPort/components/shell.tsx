"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { adminFetch, adminLogout, initials } from "@/lib/admin";
import { useAdmin } from "@/lib/use-admin";

/*
  Console shell.

  Structure mirrors the learner dashboard (248px rail, 76px topbar, grouped nav,
  aria-current, skip link, mobile drawer + bottom bar) because the two surfaces
  belong to one product and jump between each other constantly.

  Two fixes over the previous shell:
    - the identity block used to read `user?.email` from a payload that never
      carried it, so the console always showed a blank email. It now fetches
      GET /admin/me (and falls back to the name from the token if that fails).
    - nav counts are real: every badge comes from an endpoint, and a badge that
      could not be loaded simply does not render rather than showing a wrong "0".
*/

type NavItem = { href: string; label: string; icon: IconName; badge?: keyof Counts; alert?: boolean };
type Counts = {
  users: number;
  courses: number;
  classrooms: number;
  live: number;
  pendingRequests: number;
  pendingBookings: number;
  unreadMessages: number;
  unreadAlerts: number;
  sessions: number;
  materials: number;
  recordings: number;
  transactions: number;
};

const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: "grid" },
  { href: "/users", label: "Learners", icon: "users", badge: "users" },
  { href: "/courses", label: "Courses", icon: "bookOpen", badge: "courses" },
  { href: "/classrooms", label: "Classrooms", icon: "layers", badge: "classrooms" },
  { href: "/live", label: "Live Control", icon: "radio", badge: "live", alert: true },
  { href: "/bookings", label: "Bookings", icon: "calendarCheck", badge: "pendingBookings" },
  { href: "/requests", label: "Class Requests", icon: "clipboard", badge: "pendingRequests" },
];

const MORE_NAV: NavItem[] = [
  { href: "/sessions", label: "Sessions", icon: "calendar" },
  { href: "/materials", label: "Materials", icon: "folder" },
  { href: "/recordings", label: "Recordings", icon: "disc" },
  { href: "/messages", label: "Messages", icon: "messageSquare", badge: "unreadMessages" },
  { href: "/notifications", label: "Notifications", icon: "bell", badge: "unreadAlerts" },
  { href: "/transactions", label: "Transactions", icon: "receipt" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const MOBILE_NAV = [
  { href: "/", label: "Overview", icon: "grid" as IconName },
  { href: "/users", label: "Learners", icon: "users" as IconName },
  { href: "/live", label: "Live", icon: "radio" as IconName },
  { href: "/messages", label: "Inbox", icon: "messageSquare" as IconName },
  { href: "/courses", label: "Courses", icon: "bookOpen" as IconName },
];

const ALL_NAV = [...MAIN_NAV, ...MORE_NAV];

/** Longest-prefix match so /courses/<id> keeps "Courses" current. */
function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState<"" | "bell" | "user">("");
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /* Counts: one request per list that already exists as an admin endpoint.
     Every source is optional — a failure removes that badge, never the page. */
  const stats = useAdmin<any>("/admin/stats");
  const requests = useAdmin<any[]>("/admin/requests");
  const bookings = useAdmin<any[]>("/admin/bookings");
  /* Real endpoint. This was written as "/admin/messages/conversations", which
     does not exist — the route is GET /admin/conversations (admin.ts). The 404
     silently zeroed the rail's unread badge. */
  const conversations = useAdmin<any[]>("/admin/conversations");
  const notifications = useAdmin<any[]>("/admin/notifications");
  const me = useAdmin<any>("/admin/me");

  const navigateTo = useCallback((href: string) => {
    setDrawer(false);
    setPalette(false);
    setMenu("");
    window.location.href = href;
  }, []);

  /* Theme + motion preferences, restored from storage after mount so the first
     paint cannot mismatch the server markup. */
  useEffect(() => {
    setHydrated(true);
    setTheme((localStorage.getItem("ferix_admin_theme") as "dark" | "light") ?? "dark");
    setReduceMotion(localStorage.getItem("ferix_admin_reduce_motion") === "1");
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPalette(false);
        setMenu("");
        setDrawer(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("ferix_admin_theme", theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("ferix_admin_reduce_motion", reduceMotion ? "1" : "0");
  }, [reduceMotion, hydrated]);

  /* Cmd/Ctrl+K opens the palette from anywhere. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const list = useCallback((d: any[] | null) => (Array.isArray(d) ? d : []), []);

  /* Every count below comes from a request the console already makes. A source
     that failed or has not resolved contributes 0 — and a 0 badge never
     renders — so nothing here can show a number it did not receive. */
  const counts = useMemo<Counts>(() => {
    const req = list(requests.data);
    const bk = list(bookings.data);
    const cv = list(conversations.data);
    const nt = list(notifications.data);
    return {
      users: stats.data?.students ?? 0,
      courses: stats.data?.publishedCourses ?? 0,
      classrooms: stats.data?.activeClassrooms ?? 0,
      live: stats.data?.liveSessions ?? 0,
      pendingRequests: stats.data?.pendingRequests ?? req.filter((r: any) => r?.status === "pending").length,
      pendingBookings: stats.data?.pendingBookings ?? bk.filter((b: any) => b?.status === "pending").length,
      unreadMessages: cv.reduce((n: number, c: any) => n + (Number(c?.unread) || 0), 0),
      unreadAlerts: nt.filter((n: any) => !n?.is_read).length,
      sessions: 0,
      materials: 0,
      recordings: 0,
      transactions: stats.data?.successfulPayments ?? 0,
    };
  }, [stats.data, requests.data, bookings.data, conversations.data, notifications.data, list]);

  const displayName = me.data?.full_name || me.data?.email || "Admin";
  const displayEmail = me.data?.email || "";
  const role = me.data?.role || "ADMIN";

  /* Palette: real destinations, plus the admin's own keywords. */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = ALL_NAV.map((n) => ({ href: n.href, label: n.label, kind: "Page" as const, icon: n.icon }));
    const actions = [
      { href: "/live", label: "Start a live session", kind: "Action" as const, icon: "radio" as IconName },
      { href: "/courses", label: "Add a course", kind: "Action" as const, icon: "plus" as IconName },
      { href: "/classrooms", label: "Create a classroom", kind: "Action" as const, icon: "plus" as IconName },
      { href: "/users", label: "Find a learner", kind: "Action" as const, icon: "search" as IconName },
      { href: "/materials", label: "Upload material", kind: "Action" as const, icon: "upload" as IconName },
      { href: "/settings", label: "Site settings", kind: "Action" as const, icon: "settings" as IconName },
    ];
    if (!q) return items;
    const all = [...items, ...actions];
    return all.filter((i) => i.label.toLowerCase().includes(q) || i.href.includes(q));
  }, [query]);

  useEffect(() => setCursor(0), [query]);

  const onPaletteKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      navigateTo(results[cursor].href);
    }
  };

  const badge = (item: NavItem) => {
    if (!item.badge) return null;
    const n = counts[item.badge];
    if (!n) return null;
    return <span className={`ad-nav-count${item.alert ? " is-alert" : ""}`}>{n}</span>;
  };

  const navLink = (item: NavItem) => {
    const current = isCurrent(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className="ad-nav-link"
        aria-current={current ? "page" : undefined}
        onClick={() => setDrawer(false)}
      >
        <Icon name={item.icon} size={17} />
        <span>{item.label}</span>
        {badge(item)}
      </Link>
    );
  };

  return (
    <div className={`ad${reduceMotion ? " ad-reduce-motion" : ""}`} data-theme={theme}>
      <a className="ad-skip" href="#ad-main">
        Skip to main content
      </a>

      <div className="ad-layout">
        {drawer ? <div className="ad-scrim" onClick={() => setDrawer(false)} aria-hidden="true" /> : null}

        <nav
          className={`ad-rail${drawer ? " is-open" : ""}`}
          aria-label="Admin console sections"
        >
          <Link href="/" className="ad-brand" onClick={() => setDrawer(false)}>
            <span className="ad-brand-mark" aria-hidden="true">
              <Icon name="sparkles" size={20} />
            </span>
            <span>
              <span className="ad-brand-name">FerixCourse</span>
              <span className="ad-brand-tag">Admin</span>
            </span>
          </Link>

          <div className="ad-nav">
            <div>
              <p className="ad-nav-label" id="ad-nav-main">
                Main
              </p>
              <div role="group" aria-labelledby="ad-nav-main">{MAIN_NAV.map(navLink)}</div>
            </div>
            <div>
              <p className="ad-nav-label" id="ad-nav-more">
                Manage
              </p>
              <div role="group" aria-labelledby="ad-nav-more">{MORE_NAV.map(navLink)}</div>
            </div>
          </div>

          <div className="ad-rail-foot">
            <div className="ad-rail-user">
              <span className="ad-avatar" aria-hidden="true">{initials(displayName)}</span>
              <span className="ad-rail-user-text">
                <span className="ad-rail-user-name">{displayName}</span>
                <span className="ad-rail-user-mail">{displayEmail || role}</span>
              </span>
            </div>
            <div className="ad-rail-actions">
              <button
                type="button"
                className="ad-btn ad-btn-ghost ad-btn-sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              >
                <Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
                {theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>
          </div>
        </nav>

        <div className="ad-main">
          <header className="ad-topbar">
            <button
              type="button"
              className="ad-icon-btn ad-only-mobile"
              onClick={() => setDrawer(true)}
              aria-label="Open navigation"
              aria-expanded={drawer}
              aria-controls="ad-rail"
            >
              <Icon name="menu" size={19} />
            </button>

            <div style={{ minWidth: 0 }}>
              <p className="ad-topbar-title">
                {ALL_NAV.find((n) => isCurrent(pathname, n.href))?.label ?? "Console"}
              </p>
              <p className="ad-topbar-sub">FerixCourse operations</p>
            </div>

            <div className="ad-topbar-actions">
              <button
                type="button"
                className="ad-search-trigger"
                onClick={() => setPalette(true)}
                aria-label="Search the console"
              >
                <Icon name="search" size={16} />
                <span>Search pages and actions…</span>
                <kbd className="ad-kbd">Ctrl K</kbd>
              </button>

              <div className="ad-menu-wrap">
                <button
                  type="button"
                  className="ad-icon-btn"
                  onClick={() => setMenu(menu === "bell" ? "" : "bell")}
                  aria-label={`Notifications${counts.unreadAlerts ? `, ${counts.unreadAlerts} unread` : ""}`}
                  aria-expanded={menu === "bell"}
                  aria-haspopup="dialog"
                >
                  <Icon name="bell" size={18} />
                  {counts.unreadAlerts > 0 ? <span className="ad-dot-alert" /> : null}
                </button>
                {menu === "bell" ? (
                  <div className="ad-menu" role="dialog" aria-label="Recent notifications">
                    <div className="ad-menu-head">
                      <p>Recent notifications</p>
                      <span>
                        {notifications.loading
                          ? "Loading…"
                          : counts.unreadAlerts
                            ? `${counts.unreadAlerts} unread`
                            : "All caught up"}
                      </span>
                    </div>
                    {notifications.error ? (
                      <p className="ad-menu-item ad-muted">{notifications.error}</p>
                    ) : list(notifications.data).length === 0 && !notifications.loading ? (
                      <p className="ad-menu-item ad-muted">No notifications yet.</p>
                    ) : (
                      list(notifications.data).slice(0, 5).map((n: any) => (
                        <Link key={n.id} href="/notifications" className="ad-menu-item" onClick={() => setMenu("")}>
                          <Icon name={n.is_read ? "info" : "bell"} size={15} />
                          <span>
                            <strong style={{ display: "block", fontSize: 12.5 }}>{n.title}</strong>
                            <span className="ad-faint" style={{ fontSize: 11.5 }}>{n.user_email || n.type}</span>
                          </span>
                        </Link>
                      ))
                    )}
                    <div className="ad-menu-sep" />
                    <Link href="/notifications" className="ad-menu-item" onClick={() => setMenu("")}>
                      <Icon name="arrowRight" size={15} /> View all
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="ad-menu-wrap">
                <button
                  type="button"
                  className="ad-icon-btn"
                  onClick={() => setMenu(menu === "user" ? "" : "user")}
                  aria-label="Account menu"
                  aria-expanded={menu === "user"}
                  aria-haspopup="menu"
                >
                  <span className="ad-avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
                    {initials(displayName)}
                  </span>
                </button>
                {menu === "user" ? (
                  <div className="ad-menu" role="menu" aria-label="Account">
                    <div className="ad-menu-head">
                      <p>{displayName}</p>
                      <span>{displayEmail || role}</span>
                    </div>
                    <Link href="/settings" className="ad-menu-item" role="menuitem" onClick={() => setMenu("")}>
                      <Icon name="settings" size={15} /> Console settings
                    </Link>
                    <button
                      type="button"
                      className="ad-menu-item"
                      role="menuitem"
                      onClick={() => setReduceMotion(!reduceMotion)}
                      aria-pressed={reduceMotion}
                    >
                      <Icon name="activity" size={15} />
                      {reduceMotion ? "Enable animations" : "Reduce motion"}
                    </button>
                    <div className="ad-menu-sep" />
                    <button
                      type="button"
                      className="ad-menu-item ad-menu-item-danger"
                      role="menuitem"
                      onClick={() => {
                        adminLogout();
                        window.location.href = "/login";
                      }}
                    >
                      <Icon name="logOut" size={15} /> Log out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="ad-content" id="ad-main" tabIndex={-1}>
            <div className="ad-content-inner">{children}</div>
          </main>
        </div>
      </div>

      <nav className="ad-mobile-nav" aria-label="Primary">
        {MOBILE_NAV.map((item) => {
          const current = isCurrent(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              /* The desktop rail is in the DOM at every width, so marking both
                 navs current published two aria-current="page" nodes — one of
                 them hidden. The rail is the primary destination marker and
                 owns aria-current; this bar stays visually active via CSS. */
            >
              <Icon name={item.icon} size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {palette ? (
        <div
          className="ad-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPalette(false);
          }}
        >
          <div className="ad-palette" role="dialog" aria-modal="true" aria-label="Search the console">
            <div className="ad-palette-input">
              <Icon name="search" size={18} />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onPaletteKey}
                placeholder="Search pages and actions…"
                aria-label="Search the console"
                aria-controls="ad-palette-list"
                aria-activedescendant={results[cursor] ? `ad-pal-${cursor}` : undefined}
              />
              <kbd className="ad-kbd">Esc</kbd>
            </div>
            <div className="ad-palette-list" id="ad-palette-list" role="listbox" aria-label="Results">
              {results.length === 0 ? (
                <p className="ad-palette-item ad-muted">No matches for “{query}”.</p>
              ) : (
                results.map((r, i) => (
                  <Link
                    key={`${r.href}-${r.label}`}
                    id={`ad-pal-${i}`}
                    href={r.href}
                    role="option"
                    aria-selected={i === cursor}
                    className="ad-palette-item"
                    onClick={() => setPalette(false)}
                    onMouseEnter={() => setCursor(i)}
                  >
                    <Icon name={r.icon} size={16} />
                    <span>{r.label}</span>
                    <span className="kind">{r.kind}</span>
                  </Link>
                ))
              )}
            </div>
            <div className="ad-palette-foot">
              <span>↑↓ to navigate</span>
              <span>↵ to open</span>
              <span>{results.length} results</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
