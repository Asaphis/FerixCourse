"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { initials } from "@/components/ui/primitives";
import { PrefsProvider, ToastProvider, usePrefs, useToast } from "./preferences";
import { DashboardProvider, useDashboard } from "./dashboard-context";
import { apiLogout } from "@/lib/auth";

/*
  Dashboard shell — ported from demo/rebuild-learner.html.

  Structure mirrors the reference exactly:
    .reb (tokens + base, was :root/body)
      .reb-frame (container-type:inline-size, container-name:app — was #frame)
        .app → rail | col(topbar, view, dock) | scrim | more-sheet | palette

  Mount points:
    <DashboardShell>                    private routes (redirects to /login)
    <DashboardShell requireAuth={false}> routes that also work logged out

  Auth behaviour (token storage, single 401 redirect) still lives in
  lib/auth.ts + DashboardProvider — this file only owns presentation.
*/

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  count?: number;
  alert?: boolean;
  /** Extra prefixes that should also mark this item as current. */
  alsoActive?: string[];
};

type NavGroup = { label: string; items: NavItem[] };

function useNavGroups(): NavGroup[] {
  const { data, publicMode, outage, unreadNotifications, unreadMessages, pendingRequests } = useDashboard();

  /* Counts are only meaningful once the account data actually loaded. Showing a
     zero from a failed request would read as "you have nothing". */
  const countsKnown = !publicMode && !outage;

  return useMemo(
    () => [
      {
        label: "Main",
        items: [
          { href: "/dashboard", label: "Board", icon: "grid" },
          { href: "/my-courses", label: "My Courses", icon: "bookOpen" },
          {
            href: "/classes",
            label: "My Classrooms",
            icon: "monitorPlay",
            count: countsKnown ? data?.classrooms.length : undefined,
            alsoActive: ["/classrooms"],
          },
          { href: "/catalog", label: "Catalog", icon: "compass" },
        ],
      },
      {
        label: "Practice",
        items: [
          { href: "/live", label: "Live training", icon: "radio" },
          {
            href: "/messages",
            label: "Messages",
            icon: "messageSquare",
            count: countsKnown ? unreadMessages : undefined,
            alert: countsKnown && unreadMessages > 0,
          },
          {
            href: "/request",
            label: "Class requests",
            icon: "sparkles",
            count: countsKnown ? pendingRequests : undefined,
            alert: countsKnown && pendingRequests > 0,
          },
          { href: "/book", label: "Book 1-on-1", icon: "calendarCheck", alsoActive: ["/bookings"] },
        ],
      },
      {
        label: "Account",
        items: [
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
    [data?.classrooms.length, unreadNotifications, unreadMessages, pendingRequests, countsKnown]
  );
}

/** Current-destination test shared by rail + dock. */
function useIsActive() {
  const pathname = usePathname();
  return useCallback(
    (item: { href: string; alsoActive?: string[] }) => {
      const prefixes = [item.href, ...(item.alsoActive ?? [])];
      return prefixes.some((h) => pathname === h || pathname.startsWith(`${h}/`));
    },
    [pathname]
  );
}

/* ---------- Command palette (⌘K) ---------- */

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { data, publicMode } = useDashboard();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const targets = useMemo(() => {
    const pages: Array<{ label: string; href: string; kind: string; icon: IconName }> = [
      { label: "Board", href: "/dashboard", kind: "Page", icon: "grid" },
      { label: "My Courses", href: "/my-courses", kind: "Page", icon: "bookOpen" },
      { label: "My Classrooms", href: "/classes", kind: "Page", icon: "monitorPlay" },
      { label: "Catalog", href: "/catalog", kind: "Page", icon: "compass" },
      { label: "Live training room", href: "/live", kind: "Page", icon: "radio" },
      { label: "Messages", href: "/messages", kind: "Page", icon: "messageSquare" },
      { label: "Class requests", href: "/request", kind: "Page", icon: "sparkles" },
      { label: "Book 1-on-1", href: "/book", kind: "Page", icon: "calendarCheck" },
      { label: "Notifications", href: "/notifications", kind: "Page", icon: "bell" },
      { label: "Transactions", href: "/transactions", kind: "Page", icon: "receipt" },
      { label: "Profile", href: "/profile", kind: "Page", icon: "user" },
    ];
    if (publicMode) return pages.filter((p) => ["/catalog", "/request"].includes(p.href));
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
      const t = setTimeout(() => inputRef.current?.focus(), 40);
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
      className="palette-wrap on"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search FerixCourse">
        <div className="pin">
          <Icon name="search" size={18} style={{ color: "var(--faint)" }} />
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
            aria-controls="reb-palette-results"
            aria-activedescendant={results[active] ? `reb-palette-opt-${active}` : undefined}
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
        <div className="plist" id="reb-palette-results" role="listbox" aria-label="Results">
          {results.map((r, i) => (
            <button
              key={`${r.kind}-${r.href}-${r.label}`}
              id={`reb-palette-opt-${i}`}
              type="button"
              role="option"
              aria-selected={i === active}
              className={i === active ? "on" : undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.href)}
            >
              <Icon name={r.icon} size={16} />
              <span>{r.label}</span>
              <span className="kind">{r.kind}</span>
            </button>
          ))}
          {!results.length && <p style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>No matches.</p>}
        </div>
        <div className="pfoot">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Topbar ---------- */

function Topbar({ onOpenPalette, onOpenRail }: { onOpenPalette: () => void; onOpenRail: () => void }) {
  const { data, unreadNotifications, publicMode } = useDashboard();
  const name = data?.profile?.full_name || data?.profile?.email?.split("@")[0] || "Learner";

  return (
    <header className="topbar">
      <button type="button" className="icon-btn only-m" onClick={onOpenRail} aria-label="Open navigation">
        <Icon name="menu" size={19} />
      </button>

      <button type="button" className="search-trig" onClick={onOpenPalette} aria-label="Search — opens command palette">
        <Icon name="search" size={16} />
        <span>Search pages, courses, classrooms…</span>
        <kbd>⌘K</kbd>
      </button>

      <div className="tb-actions">
        {publicMode ? (
          <>
            <Link href="/login" className="btn ghost sm">
              Log in
            </Link>
            <Link href="/register" className="btn pri sm">
              Sign up free
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/notifications"
              className="icon-btn"
              aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"}
            >
              <Icon name="bell" size={18} />
              {unreadNotifications > 0 && <span className="dot" aria-hidden="true" />}
            </Link>
            <Link href="/profile" className="avatar" title={name} aria-label={`Profile — ${name}`}>
              {initials(name)}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

/* ---------- Rail ---------- */

function Rail({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { publicMode } = useDashboard();
  const groups = useNavGroups();
  const isActive = useIsActive();

  return (
    <aside className={`rail${open ? " open" : ""}`} aria-label="Navigation">
      <Link href={publicMode ? "/catalog" : "/dashboard"} className="brand">
        <span className="brand-mark">FC</span>
        <span>
          <b>FerixCourse</b>
          <small>Learn. Ship. Repeat.</small>
        </span>
      </Link>

      <nav className="nav" aria-label="Main">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="nav-label">{group.label}</p>
            {group.items.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "on" : undefined}
                  aria-current={active ? "page" : undefined}
                  onClick={onClose}
                >
                  <Icon name={item.icon} size={18} />
                  <span className="t">{item.label}</span>
                  {item.count ? <span className={`cnt${item.alert ? " alert" : ""}`}>{item.count}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="promo">
        {publicMode ? (
          <>
            <h4>Start learning today</h4>
            <p>Create a free account to enroll, join live cohorts and track progress.</p>
            <Link href="/register" className="btn pri sm block" onClick={onClose}>
              Create free account
            </Link>
          </>
        ) : (
          <>
            <h4>Need a custom track?</h4>
            <p>Tell us the topic and we match you to an instructor.</p>
            <Link href="/request" className="btn pri sm block" onClick={onClose}>
              Request training
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}

/* ---------- Mobile dock + More sheet ---------- */

function Dock({ onOpenSheet }: { onOpenSheet: () => void }) {
  const { unreadMessages } = useDashboard();
  const isActive = useIsActive();

  const items = [
    { href: "/dashboard", label: "Board", icon: "grid" as IconName },
    { href: "/classes", label: "Rooms", icon: "monitorPlay" as IconName, alsoActive: ["/classrooms"] },
    { href: "/messages", label: "Chat", icon: "messageSquare" as IconName },
  ];

  return (
    <nav className="dock" aria-label="Primary">
      {items.map((item) => {
        const active = isActive(item);
        const badge = item.href === "/messages" && unreadMessages > 0 ? unreadMessages : 0;
        return (
          <Link key={item.href} href={item.href} className={active ? "on" : undefined} aria-current={active ? "page" : undefined}>
            <Icon name={item.icon} size={19} />
            {item.label}
            {badge ? <span className="cnt">{badge}</span> : null}
          </Link>
        );
      })}
      <button type="button" onClick={onOpenSheet} aria-haspopup="dialog">
        <Icon name="more" size={19} />
        More
      </button>
    </nav>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { unreadNotifications } = useDashboard();

  const links = [
    { href: "/profile", label: "You · Profile", icon: "user" as IconName },
    { href: "/my-courses", label: "My Courses", icon: "bookOpen" as IconName },
    { href: "/catalog", label: "Catalog", icon: "compass" as IconName },
    { href: "/live", label: "Live training", icon: "radio" as IconName },
    { href: "/request", label: "Class requests", icon: "sparkles" as IconName },
    { href: "/book", label: "Book 1-on-1", icon: "calendarCheck" as IconName },
    {
      href: "/notifications",
      label: "Notifications",
      icon: "bell" as IconName,
      count: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    { href: "/transactions", label: "Transactions", icon: "receipt" as IconName },
  ];

  return (
    <>
      <div className={`sheet-scrim${open ? " on" : ""}`} onClick={onClose} aria-hidden="true" />
      <div className={`more-sheet${open ? " on" : ""}`} role="dialog" aria-modal="true" aria-label="More destinations" aria-hidden={!open}>
        <div className="handle" />
        <h4>More</h4>
        <div className="mrow2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={onClose} tabIndex={open ? 0 : -1}>
              <Icon name={l.icon} size={17} />
              {l.label}
              {l.count ? <span className="cnt">{l.count}</span> : null}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- Shell body ---------- */

function ShellBody({
  children,
  theme,
}: {
  children: ReactNode;
  theme: "dark" | "light";
}) {
  const pathname = usePathname();
  const { outage, reload } = useDashboard();
  const [railOpen, setRailOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [announce, setAnnounce] = useState("");

  /* The reference marks messages/live as fit (no page scroll — panels scroll). */
  const fit = pathname === "/messages" || pathname === "/live" || pathname.endsWith("/live");

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
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
        setSheetOpen(false);
        setRailOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Close overlays + announce route changes on navigation. */
  useEffect(() => {
    setRailOpen(false);
    setSheetOpen(false);
    setPaletteOpen(false);
    const heading = document.querySelector("h1");
    setAnnounce(`Navigated to ${heading?.textContent?.trim() || pathname}`);
  }, [pathname]);

  return (
    <div className="reb" data-theme={theme}>
      <a className="fc-skip" href="#reb-main">
        Skip to main content
      </a>
      <div className="reb-frame">
        <div className="app">
          <Rail open={railOpen} onClose={() => setRailOpen(false)} />
          <div className={`scrim${railOpen ? " on" : ""}`} onClick={() => setRailOpen(false)} aria-hidden="true" />

          <div className="col">
            <Topbar onOpenPalette={() => setPaletteOpen(true)} onOpenRail={() => setRailOpen(true)} />
            <main className="view" id="reb-main" tabIndex={-1} data-fit={fit ? "1" : undefined}>
              {outage && (
                <div style={{ padding: "22px 26px 0" }}>
                  <div className="alert danger" role="alert" style={{ marginBottom: 0 }}>
                    <Icon name="alertCircle" size={17} style={{ marginTop: 1 }} />
                    <span style={{ flex: 1 }}>
                      We could not reach FerixCourse. Your data is safe — this is a connection problem on our side.
                    </span>
                    <button type="button" className="btn ghost sm" onClick={reload}>
                      <Icon name="refresh" size={14} /> Try again
                    </button>
                  </div>
                </div>
              )}
              {children}
            </main>
            <Dock onOpenSheet={() => setSheetOpen(true)} />
          </div>

          <MoreSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </div>
      </div>
      <p className="fc-sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

/** One PrefsProvider for the whole shell so the theme is a single source of truth. */
function PrefsShell({ children }: { children: ReactNode }) {
  const { prefs } = usePrefs();
  return <ShellBody theme={prefs.theme}>{children}</ShellBody>;
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
        <PrefsProvider>
          <PrefsShell>{children}</PrefsShell>
        </PrefsProvider>
      </ToastProvider>
    </DashboardProvider>
  );
}

/* ---------- Page scaffolding ---------- */

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="ph">
      <div>
        <h1>{title}</h1>
        {sub ? <p className="sub">{sub}</p> : null}
      </div>
      <div className="sp" />
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}

/** Renders a per-page error banner from a real failed request, with a retry. */
export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="alert danger" role="alert">
      <Icon name="alertCircle" size={17} style={{ marginTop: 1 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry ? (
        <button type="button" className="btn ghost sm" onClick={onRetry}>
          <Icon name="refresh" size={14} /> Retry
        </button>
      ) : null}
    </div>
  );
}

/** Sign-out control reused by the profile page (the reference topbar has none). */
export function SignOutButton({ className = "btn ghost" }: { className?: string }) {
  const router = useRouter();
  const { push } = useToast();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        apiLogout();
        push("Signed out.");
        router.push("/");
      }}
    >
      <Icon name="logOut" size={16} /> Sign out
    </button>
  );
}
