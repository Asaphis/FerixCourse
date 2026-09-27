"use client";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

/*
  Shared console primitives. Every one of them is presentational and takes real
  data; none of them invent content.
*/

/* ---------- page scaffolding ---------- */

export function PageHead({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="ad-page-head">
      <div className="ad-page-head-row">
        <div>
          <h1 className="ad-page-title">{title}</h1>
          {sub ? <p className="ad-page-sub">{sub}</p> : null}
        </div>
        {actions ? <div className="ad-page-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export function SectionHead({
  title,
  count,
  actions,
}: {
  title: string;
  count?: number;
  actions?: ReactNode;
}) {
  return (
    <div className="ad-sec-head">
      <h2 className="ad-sec-title">{title}</h2>
      {count !== undefined ? <span className="ad-badge">{count}</span> : null}
      {actions ? <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>{actions}</div> : null}
    </div>
  );
}

/* ---------- feedback ---------- */

export function Alert({
  tone = "danger",
  icon = "alertCircle",
  children,
  action,
}: {
  tone?: "danger" | "ok" | "warn" | "info";
  icon?: IconName;
  children: ReactNode;
  action?: ReactNode;
}) {
  const role = tone === "danger" || tone === "warn" ? "alert" : "status";
  return (
    <div className={`ad-alert ad-alert-${tone}`} role={role}>
      <Icon name={icon} size={17} />
      <span>{children}</span>
      {action}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <Alert
      tone="danger"
      action={
        onRetry ? (
          <button type="button" className="ad-btn ad-btn-sm" onClick={onRetry}>
            <Icon name="refresh" size={13} /> Retry
          </button>
        ) : undefined
      }
    >
      {message}
    </Alert>
  );
}

export function OkNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <Alert tone="ok" icon="check">
      {message}
    </Alert>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ad-empty">
      <span className="ad-empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ height = 90, count = 3 }: { height?: number; count?: number }) {
  return (
    <div className="ad-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ad-skel" style={{ height }} />
      ))}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="ad-sm ad-muted" role="status">
      {label}
    </p>
  );
}

/* ---------- data display ---------- */

export function StatCard({
  icon,
  label,
  value,
  foot,
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <div className="ad-card">
      <div className="ad-stat">
        <span className="ad-stat-icon">
          <Icon name={icon} size={20} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p className="ad-stat-label">{label}</p>
          <p className="ad-stat-value">{value}</p>
          {foot ? <p className="ad-stat-foot">{foot}</p> : null}
        </div>
      </div>
    </div>
  );
}

type BadgeTone = "neutral" | "ok" | "warn" | "info" | "danger" | "brand";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`ad-badge${tone === "neutral" ? "" : ` ad-badge-${tone}`}`}>{children}</span>;
}

/** Maps the real status strings from the database to a colour + label. */
export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = String(status ?? "").toLowerCase();
  const map: Record<string, { tone: BadgeTone; label: string }> = {
    pending: { tone: "warn", label: "Pending" },
    reviewing: { tone: "info", label: "Reviewing" },
    accepted: { tone: "ok", label: "Accepted" },
    rejected: { tone: "danger", label: "Rejected" },
    converted: { tone: "brand", label: "Converted" },
    confirmed: { tone: "info", label: "Confirmed" },
    paid: { tone: "ok", label: "Paid" },
    completed: { tone: "ok", label: "Completed" },
    cancelled: { tone: "danger", label: "Cancelled" },
    successful: { tone: "ok", label: "Successful" },
    failed: { tone: "danger", label: "Failed" },
    scheduled: { tone: "neutral", label: "Scheduled" },
    live: { tone: "danger", label: "Live" },
    ended: { tone: "neutral", label: "Ended" },
    recording: { tone: "danger", label: "Recording" },
    processing: { tone: "warn", label: "Processing" },
    ready: { tone: "ok", label: "Ready" },
    none: { tone: "neutral", label: "Not recorded" },
    published: { tone: "ok", label: "Published" },
    draft: { tone: "warn", label: "Draft" },
  };
  const hit = map[s];
  if (!hit) return <Badge>{status || "—"}</Badge>;
  return <Badge tone={hit.tone}>{hit.label}</Badge>;
}

export function Avatar({ name }: { name: string | null | undefined }) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  const text = parts.length ? (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase() : "?";
  return (
    <span className="ad-avatar" aria-hidden="true">
      {text}
    </span>
  );
}

export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="ad-sm ad-muted">{label}</span>
        <span className="ad-sm ad-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
          {value}/{max}
        </span>
      </div>
      <div className="ad-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="ad-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  id,
  children,
}: {
  label: string;
  hint?: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="ad-field">
      <label className="ad-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? <span className="ad-hint">{hint}</span> : null}
    </div>
  );
}

/** A confirm-then-act button for the destructive endpoints. */
export function DangerButton({
  label,
  confirmLabel,
  onConfirm,
  pending,
  small = true,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  small?: boolean;
}) {
  return (
    <DangerButtonInner label={label} confirmLabel={confirmLabel} onConfirm={onConfirm} pending={pending} small={small} />
  );
}

/* Kept as a separate component so the confirm state resets with the key when
   the row it belongs to changes. */
function DangerButtonInner({
  label,
  confirmLabel,
  onConfirm,
  pending,
  small,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  small?: boolean;
}) {
  const [arm, setArm] = useStateSafe(false);
  if (arm) {
    return (
      <button
        type="button"
        className={`ad-btn ad-btn-danger${small ? " ad-btn-sm" : ""}`}
        disabled={pending}
        onClick={() => {
          setArm(false);
          onConfirm();
        }}
        onBlur={() => setArm(false)}
      >
        <Icon name="alertCircle" size={13} /> {confirmLabel}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`ad-btn ad-btn-ghost${small ? " ad-btn-sm" : ""}`}
      disabled={pending}
      onClick={() => setArm(true)}
    >
      <Icon name="trash" size={13} /> {label}
    </button>
  );
}

/* Tiny local state helper so the confirm button does not need the caller to
   track arming per row. */
import { useState as useStateReact } from "react";
function useStateSafe(initial: boolean) {
  return useStateReact(initial);
}
