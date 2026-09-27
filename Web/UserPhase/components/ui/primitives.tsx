"use client";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export type Tone = "ok" | "warn" | "info" | "danger" | "neutral" | "brand";

/* ---------- Badge ---------- */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`fc-badge fc-badge-${tone}`}>{children}</span>;
}

/* Maps the real backend status strings onto a tone, so status colouring is
   consistent everywhere instead of hand-rolled per page. */
const STATUS_TONES: Record<string, Tone> = {
  successful: "ok", success: "ok", paid: "ok", confirmed: "ok", completed: "ok",
  active: "ok", ready: "ok", accepted: "ok", verified: "ok", published: "ok",
  pending: "warn", reviewing: "warn", processing: "warn", queued: "warn", draft: "warn",
  failed: "danger", cancelled: "danger", canceled: "danger", rejected: "danger",
  expired: "danger", inactive: "danger", disabled: "danger", error: "danger",
  scheduled: "info", live: "info", streaming: "info", recorded: "info",
};

export function StatusBadge({ status, label }: { status?: string | null; label?: string }) {
  const raw = String(status ?? "").trim();
  const tone: Tone = raw ? STATUS_TONES[raw.toLowerCase()] ?? "neutral" : "neutral";
  return <Badge tone={tone}>{label ?? (raw || "unknown")}</Badge>;
}

/* ---------- Progress ---------- */
export function Progress({
  value,
  label,
  tone,
  className,
}: {
  value: number;
  /** Required: the bar is meaningless to a screen reader without a name. */
  label: string;
  tone?: "ok" | "info";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
  return (
    <div
      className={`fc-progress${tone ? ` fc-progress-${tone}` : ""}${className ? ` ${className}` : ""}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------- Stat tile ---------- */
export function StatCard({
  icon,
  tone,
  label,
  value,
}: {
  icon: IconName;
  tone?: "ok" | "info" | "warn";
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="fc-stat">
      <span className={`fc-stat-ico${tone ? ` is-${tone}` : ""}`}>
        <Icon name={icon} size={22} />
      </span>
      <div style={{ minWidth: 0 }}>
        <span className="fc-stat-label">{label}</span>
        <span className="fc-stat-value">{value}</span>
      </div>
    </div>
  );
}

/* ---------- Section header ---------- */
export function SectionHead({
  title,
  id,
  action,
}: {
  title: string;
  id?: string;
  action?: ReactNode;
}) {
  return (
    <div className="fc-sec-head">
      <h2 className="fc-sec-title" id={id}>
        {title}
      </h2>
      {action}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="fc-empty">
      <span className="fc-empty-ico">
        <Icon name={icon} size={20} />
      </span>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? <div style={{ marginTop: 18, display: "flex", gap: 9, justifyContent: "center", flexWrap: "wrap" }}>{action}</div> : null}
    </div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name, large }: { name: string; large?: boolean }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span className={`fc-avatar${large ? " fc-avatar-lg" : ""}`} aria-hidden="true">
      {initial}
    </span>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ height = 120, count = 1 }: { height?: number; count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="fc-skel" style={{ height }} />
      ))}
    </>
  );
}

export function LoadingGrid({ height = 120, count = 3 }: { height?: number; count?: number }) {
  return (
    <div className="fc-stats" aria-hidden="true">
      <Skeleton height={height} count={count} />
    </div>
  );
}

/* ---------- Alert ---------- */
export function Alert({ tone = "danger", children }: { tone?: "danger" | "ok"; children: ReactNode }) {
  return (
    <div className={`fc-alert fc-alert-${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon name={tone === "danger" ? "alertCircle" : "checkCircle"} size={17} style={{ marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

/* ---------- Field wrapper ---------- */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="fc-field">
      <label className="fc-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="fc-hint">{hint}</p> : null}
    </div>
  );
}

/* ---------- Filter chip ---------- */
export function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="fc-chip" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

/* ---------- Inline spinner ---------- */
export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--fc-muted)", fontSize: 13 }}>
      <Icon name="loader" size={16} style={{ animation: "fcSpin 0.8s linear infinite" }} />
      {label}
    </span>
  );
}

/* ---------- Relative time ---------- */
export function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function shortDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function shortDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function initials(text: string, max = 2): string {
  return (text || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}
