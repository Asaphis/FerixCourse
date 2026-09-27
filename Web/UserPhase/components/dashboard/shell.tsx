"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { Avatar } from "@/components/ui/primitives";
import { PrefsProvider, ToastProvider, usePrefs, useToast } from "./preferences";
import { DashboardProvider, useDashboard } from "./dashboard-context";
import { apiLogout } from "@/lib/auth";

/*
  Dashboard shell.

  Rail order mirrors the approved design: logo → grouped nav → promo card.
  Header order mirrors it too: search left, theme/bell/identity right.

  Two mount points:
    - <DashboardShell>       wraps the private dashboard routes (redirects to
                             /login when the session is gone).
    - <DashboardShell requireAuth={false}>  for screens that are also public
                             (catalog, a course page): same chrome, but a
                             logged-out visitor keeps browsing instead of
                             being bounced to login.

  Accessibility: skip link, real aria-current on the active destination,
  role="menu" dropdowns with Escape + focus return, a focusable command
  palette, and a polite live region that announces page changes.
*/

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  count?: number;
  alert?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

function useNavGroups(): NavGroup[] {
  const { data, publicMode, outage, unreadNotifications, unreadMessages, pendingRequests, upcomingBookings } =
    useDashboard();

  /* Counts are only meaningful once the account data actually loaded. Showing a
     zero from a failed request would read as "you have nothing". */
  const countsKnown = !publicMode && !outage;

  return useMemo(
    () => [
      {
        label: "Main",
        items: [
          { href: "/dashboard", label: "Dashboard", icon: "grid" },
          {
            href: "/my-courses",
            label: "My Courses",
            icon: "bookOpen",
            count: countsKnown ? data?.courses.length : undefined,
          },
          {
            href: "/classes",
            label: "My Classrooms",
            icon: "monitorPlay",
            count: countsKnown ? data?.classrooms.length : undefined,
          },
          { href: "/learn", label: "Catalog", icon: "compass" },
          {
            href: "/request",
            label: "Class Requests",
            icon: "sparkles",
            count: countsKnown ? pendingRequests : undefined,
            alert: countsKnown && pendingRequests > 0,
          },
          {
            href: "/book",
            label: "Book Training",
            icon: "calendarCheck",
            count: countsKnown ? upcomingBookings : undefined,
          },
        ],
      },
      {
        label: "More",
        items: [
          {
            href: "/messages",
            label: "Messages",
            icon: "messageSquare",
            count: countsKnown ? unreadMessages : undefined,
            alert: countsKnown && unreadMessages > 0,
          },
          {
            href: "/notifications",
            label: "Notifications",
            icon: "bell",
            count: countsKnown ? unreadNotifications : undefined,
            alert: countsKnown && unreadNotifications > 0,
          },
          { href: "/transactions", label: "Transactions", icon: "receipt" },
          { href: "/profile", label: "Profile", icon: "user" },
        ],
      },
    ],
    [
      data?.courses.length,
      data?.classrooms.length,
      unreadNotifications,
      unreadMessages,
      pendingRequests,
      upcomingBookings,
      countsKnown,
    ]
  );
}

/* ---------- Command palette ---------- */

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { data, publicMode } = useDashboard();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const targets = useMemo(() => {
    const pages: Array<{ label: string; href: string; kind: string; icon: IconName }> = [
      { label: "Dashboard", href: "/dashboard", kind: "Page", icon: "grid" },
      { label: "My Courses", href: "/my-courses", kind: "Page", icon: "bookOpen" },
      { label: "My Classrooms", href: "/classes", kind: "Page", icon: "monitorPlay" },
      { label: "Catalog", href: "/learn", kind: "Page", icon: "compass" },
      { label: "Class Requests", href: "/request", kind: "Page", icon: "sparkles" },
      { label: "Book Training", href: "/book", kind: "Page", icon: "calendarCheck" },
      { label: "Messages", href: "/messages", kind: "Page", icon: "messageSquare" },
      { label: "Notifications", href: "/notifications", kind: "Page", icon: "bell" },
      { label: "Transactions", href: "/transactions", kind: "Page", icon: "receipt" },
      { label: "Profile", href: "/profile", kind: "Page", icon: "user" },
    ];
    if (publicMode) return pages.filter((p) => ["/learn", "/request"].includes(p.href));
    const courses = (data?.courses ?? []).map((c) => ({
      label: c.title,
      href: `/courses/${c.slug}`,
      kind: "Course",
      icon: "bookOpen" as IconName,
    }));
    const rooms = (data?.classrooms ?? []).map((c) => ({
      label: c.title,
      href: `/classrooms/${c.slug}`,
      kind: "Classroom",
      icon: "monitorPlay" as IconName,
    }));
    return [...pages, ...courses, ...rooms];
  }, [data?.courses, data?.classrooms, publicMode]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter((t) => t.label.toLowerCase().includes(q) || t.kind.toLowerCase().includes(q));
  }, [query, targets]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  if (!open) return null;

  return (
    <div
      className="fc-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fc-palette" role="dialog" aria-modal="true" aria-label="Search FerixCourse">
        <div className="fc-palette-input">
          <Icon name="search" size={18} style={{ color: "var(--fc-muted)" }} />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search pages, courses and classrooms…"
            aria-label="Search pages, courses and classrooms"
            aria-controls="fc-palette-results"
            aria-activedescendant={results[active] ? `fc-palette-opt-${active}` : undefined}
            role="combobox"
            aria-expanded="true"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                go(results[active].href);
              }
            }}
          />
        </div>
        <div className="fc-palette-list" id="fc-palette-results" role="listbox" aria-label="Results">
          {results.map((r, i) => (
            <button
              key={`${r.kind}-${r.href}-${r.label}`}
              id={`fc-palette-opt-${i}`}
              type="button"
              role="option"
              aria-selected={i === active}
              className="fc-palette-item"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.href)}
            >
              <Icon name={r.icon} size={17} />
              <span>{r.label}</span>
              <span className="kind">{r.kind}</span>
            </button>
          ))}
          {!results.length && <p className="fc-palette-empty">No matches for “{query}”.</p>}
        </div>
        <div className="fc-palette-foot">
          <span>↑↓ to navigate</span>
          <span>↵ to open</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Header ---------- */

function useDismiss(onClose: () => void) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return wrapRef;
}

function Header({ onOpenPalette, onOpenRail }: { onOpenPalette: () => void; onOpenRail: () => void }) {
  const router = useRouter();
  const { data, unreadNotifications, publicMode } = useDashboard();
  const { prefs, update } = usePrefs();
  const { push } = useToast();
  const [userOpen, setUserOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const userWrap = useDismiss(() => setUserOpen(false));
  const bellWrap = useDismiss(() => setMenuOpen(false));

  const name = data?.profile?.full_name || data?.profile?.email?.split("@")[0] || "Learner";
  const plan = data?.profile?.role === "INSTRUCTOR" ? "Instructor" : data?.profile?.role === "ADMIN" ? "Administrator" : "Learner";
  const recent = (data?.notifications ?? []).slice(0, 5);

  function logout() {
    apiLogout();
    push("Signed out.");
    router.push("/");
  }

  return (
    <header className="fc-topbar">
      <button type="button" className="fc-icon-btn fc-only-mobile" onClick={onOpenRail} aria-label="Open navigation">
        <Icon name="menu" size={19} />
      </button>

      <button type="button" className="fc-search-trigger" onClick={onOpenPalette} aria-label="Search — opens command palette">
        <Icon name="search" size={17} />
        <span>Search courses, classrooms, pages…</span>
        <kbd className="fc-kbd">⌘K</kbd>
      </button>

      <div className="fc-topbar-actions">
        <button
          type="button"
          className="fc-icon-btn"
          onClick={() => update({ theme: prefs.theme === "dark" ? "light" : "dark" })}
          aria-pressed={prefs.theme === "light"}
          aria-label={prefs.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={prefs.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          <Icon name={prefs.theme === "dark" ? "sun" : "moon"} size={18} />
        </button>

        {publicMode ? (
          <>
            <Link href="/login" className="fc-btn fc-btn-ghost fc-btn-sm">
              Log in
            </Link>
            <Link href="/register" className="fc-btn fc-btn-primary fc-btn-sm">
              Sign up free
            </Link>
          </>
        ) : (
          <>
            <div className="fc-menu-wrap" ref={bellWrap}>
              <button
                type="button"
                className="fc-icon-btn"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <Icon name="bell" size={18} />
                {unreadNotifications > 0 && <span className="fc-notif-dot" aria-hidden="true" />}
              </button>
              {menuOpen && (
                <div className="fc-menu" role="menu" aria-label="Recent notifications">
                  <div className="fc-menu-head">
                    <p>Notifications</p>
                    <span>{unreadNotifications > 0 ? `${unreadNotifications} unread` : "All caught up"}</span>
                  </div>
                  {recent.map((n) => (
                    <Link
                      key={n.id}
                      href="/notifications"
                      role="menuitem"
                      className="fc-menu-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Icon name="bell" size={16} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 600 }}>{n.title}</span>
                        <span style={{ display: "block", fontSize: 11.5, color: "var(--fc-muted)" }}>
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </span>
                    </Link>
                  ))}
                  {!recent.length && (
                    <p style={{ padding: "14px 12px", fontSize: 13, color: "var(--fc-muted)" }}>Nothing yet.</p>
                  )}
                  <div className="fc-menu-sep" />
                  <Link href="/notifications" role="menuitem" className="fc-menu-item" onClick={() => setMenuOpen(false)}>
                    <Icon name="arrowRight" size={16} />
                    View all notifications
                  </Link>
                </div>
              )}
            </div>

            <div className="fc-menu-wrap" ref={userWrap}>
              <button
                type="button"
                className="fc-user-btn"
                aria-haspopup="menu"
                aria-expanded={userOpen}
                aria-label={`Account menu for ${name}`}
                onClick={() => setUserOpen((o) => !o)}
              >
                <Avatar name={name} />
                <span style={{ minWidth: 0 }}>
                  <span className="fc-user-name">{name}</span>
                  <span className="fc-user-plan">{plan}</span>
                </span>
                <Icon name="chevronDown" size={15} style={{ color: "var(--fc-muted)" }} />
              </button>
              {userOpen && (
                <div className="fc-menu" role="menu" aria-label="Account">
                  <div className="fc-menu-head">
                    <p>{name}</p>
                    <span>{data?.profile?.email}</span>
                  </div>
                  <Link href="/profile" role="menuitem" className="fc-menu-item" onClick={() => setUserOpen(false)}>
                    <Icon name="user" size={16} /> Profile
                  </Link>
                  <Link href="/transactions" role="menuitem" className="fc-menu-item" onClick={() => setUserOpen(false)}>
                    <Icon name="receipt" size={16} /> Transactions
                  </Link>
                  <Link href="/messages" role="menuitem" className="fc-menu-item" onClick={() => setUserOpen(false)}>
                    <Icon name="messageSquare" size={16} /> Messages
                  </Link>
                  <div className="fc-menu-sep" />
                  <button type="button" role="menuitem" className="fc-menu-item fc-menu-item-danger" onClick={logout}>
                    <Icon name="logOut" size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

/* ---------- Rail ---------- */

function Rail({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { publicMode } = useDashboard();
  const groups = useNavGroups();

  return (
    <>
      {open && <div className="fc-scrim fc-only-mobile" onClick={onClose} aria-hidden="true" />}
      <aside className={`fc-sidebar${open ? " is-open" : ""}`} aria-label="Dashboard navigation">
        <Link href={publicMode ? "/learn" : "/dashboard"} className="fc-brand">
          <span className="fc-brand-mark">
            <Icon name="graduationCap" size={20} />
          </span>
          <span>
            <span className="fc-brand-name">FerixCourse</span>
            <span className="fc-brand-tag">Learn. Ship. Repeat.</span>
          </span>
        </Link>

        <nav className="fc-nav" aria-label="Main">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="fc-nav-label">{group.label}</p>
              {group.items.map((item) => {
                /* A destination is current when it is the page itself or a
                   detail page underneath it, so /bookings/:id keeps
                   "Book Training" marked as you in the rail. */
                const nested = item.href === "/book" ? ["/book", "/bookings"] : [item.href];
                const active = nested.some((h) => pathname === h || pathname.startsWith(`${h}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="fc-nav-link"
                    aria-current={active ? "page" : undefined}
                    onClick={onClose}
                  >
                    <Icon name={item.icon} size={19} />
                    <span>{item.label}</span>
                    {item.count ? <span className={`fc-nav-count${item.alert ? " is-alert" : ""}`}>{item.count}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="fc-side-promo">
          {publicMode ? (
            <>
              <h2>Start learning today</h2>
              <p>Create a free account to enroll, join live cohorts and track progress.</p>
              <Link href="/register" className="fc-btn fc-btn-primary fc-btn-block fc-btn-sm" onClick={onClose}>
                Create free account
              </Link>
              <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12 }}>
                Already a member?{" "}
                <Link href="/login" style={{ color: "var(--fc-brand)", fontWeight: 700 }}>
                  Log in
                </Link>
              </p>
            </>
          ) : (
            <>
              <h2>Need a custom track?</h2>
              <p>Tell us the topic and we will match you to an instructor.</p>
              <Link href="/request" className="fc-btn fc-btn-primary fc-btn-block fc-btn-sm" onClick={onClose}>
                Request training
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { unreadMessages, publicMode } = useDashboard();
  if (publicMode) return null;

  const items: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: "grid" },
    { href: "/my-courses", label: "Courses", icon: "bookOpen" },
    { href: "/classes", label: "Classes", icon: "monitorPlay" },
    { href: "/messages", label: "Chat", icon: "messageSquare", count: unreadMessages, alert: unreadMessages > 0 },
    { href: "/profile", label: "You", icon: "user" },
  ];

  return (
    <nav className="fc-mobile-nav" aria-label="Primary">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            /* The rail is rendered at every width, so it already publishes the
               aria-current="page" marker. Duplicating it here gave assistive
               tech two identically-marked current destinations. */
            className={active ? "is-active" : undefined}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
            {item.count ? <span className={`fc-nav-count${item.alert ? " is-alert" : ""}`}>{item.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/* ---------- Shell body ---------- */

function ShellBody({
  children,
  theme,
  reduceMotion,
}: {
  children: ReactNode;
  theme: "dark" | "light";
  reduceMotion: boolean;
}) {
  const pathname = usePathname();
  const { outage, reload } = useDashboard();
  const [railOpen, setRailOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [announce, setAnnounce] = useState("");

  /* ⌘K / Ctrl-K opens search; "/" does too when not typing in a field. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Announce route changes to assistive tech (SPA navigation is otherwise silent). */
  useEffect(() => {
    setRailOpen(false);
    const heading = document.querySelector("h1");
    setAnnounce(`Navigated to ${heading?.textContent?.trim() || pathname}`);
  }, [pathname]);

  return (
    /* Single .fc-dash root. Nesting a second one used to re-declare the dark
       token set inside the light theme, which silently overrode it. */
    <div className={`fc-dash${reduceMotion ? " fc-reduce-motion" : ""}`} data-theme={theme}>
      <a className="fc-skip" href="#fc-main">
        Skip to main content
      </a>
      <Rail open={railOpen} onClose={() => setRailOpen(false)} />
      <div className="fc-main">
        <Header onOpenPalette={() => setPaletteOpen(true)} onOpenRail={() => setRailOpen(true)} />
        <main className="fc-content" id="fc-main" tabIndex={-1}>
          <div className="fc-content-inner">
            {outage && (
              <div className="fc-alert fc-alert-danger" role="alert">
                <Icon name="alertCircle" size={17} style={{ marginTop: 1 }} />
                <span style={{ flex: 1 }}>
                  We could not reach FerixCourse. Your data is safe — this is a connection problem on our side.
                </span>
                <button type="button" className="fc-btn fc-btn-sm fc-btn-ghost" onClick={reload}>
                  <Icon name="refresh" size={14} /> Try again
                </button>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <p className="fc-sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

/**
 * One PrefsProvider for the whole dashboard, so the header toggle, the profile
 * switch and the themed root all read the SAME preference state.
 */
function PrefsShell({ children }: { children: ReactNode }) {
  return (
    <PrefsProvider>
      <ThemedShell>{children}</ThemedShell>
    </PrefsProvider>
  );
}

/** Renders the single .fc-dash root carrying the theme attribute. */
function ThemedShell({ children }: { children: ReactNode }) {
  const { prefs } = usePrefs();
  return (
    <ShellBody theme={prefs.theme} reduceMotion={prefs.reduceMotion}>
      {children}
    </ShellBody>
  );
}

export default function DashboardShell({
  children,
  requireAuth = true,
}: {
  children: ReactNode;
  requireAuth?: boolean;
}) {
  return (
    <DashboardProvider requireAuth={requireAuth}>
      <ToastProvider>
        <PrefsShell>{children}</PrefsShell>
      </ToastProvider>
    </DashboardProvider>
  );
}

/* ---------- Page scaffolding ---------- */

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="fc-page-head">
      <div className="fc-page-head-row">
        <div>
          <h1 className="fc-page-title">{title}</h1>
          {sub ? <p className="fc-page-sub">{sub}</p> : null}
        </div>
        {actions ? <div className="fc-page-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

/** Renders a per-page error banner from a real failed request, with a retry. */
export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="fc-alert fc-alert-danger" role="alert">
      <Icon name="alertCircle" size={17} style={{ marginTop: 1 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry ? (
        <button type="button" className="fc-btn fc-btn-sm fc-btn-ghost" onClick={onRetry}>
          <Icon name="refresh" size={14} /> Retry
        </button>
      ) : null}
    </div>
  );
}
