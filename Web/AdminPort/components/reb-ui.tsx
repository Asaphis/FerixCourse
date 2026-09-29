"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";

/*
  Shared primitives for the rebuilt (reference-styled) screens.

  Rules these follow, same as the old `ui.tsx` did for the legacy screens:
    - every component takes real data as props — nothing here invents content;
    - a failed load renders an error with a retry, never an empty list;
    - class names come from app/rebuild.css (ported from the reference), with
      the three renames forced by globals.css collisions: card → reb-card,
      input → reb-input, btn → reb-btn.
*/

/* ---------- icons ---------- */

/** Reference markup used `<svg class="ic">` everywhere; this keeps that class. */
export function Ic({ name, size = 18, strokeWidth }: { name: IconName; size?: number; strokeWidth?: number }) {
  return <Icon name={name} size={size} className="ic" strokeWidth={strokeWidth} />;
}

/* ---------- toasts (hosted by the shell) ---------- */

type ToastItem = { id: number; msg: string; icon: IconName };

export function toast(msg: string, icon: IconName = "check") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("reb-toast", { detail: { msg, icon } }));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent).detail as { msg: string; icon: IconName };
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, msg: detail.msg, icon: detail.icon }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3200);
    };
    window.addEventListener("reb-toast", onToast);
    return () => window.removeEventListener("reb-toast", onToast);
  }, []);
  if (!items.length) return null;
  return (
    <div className="toasts">
      {items.map((t) => (
        <div className="toast" key={t.id}>
          <Ic name={t.icon} size={16} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- page scaffolding ---------- */

/** `.ph` page header — `title` + optional italic `em` per the reference. */
export function Ph({
  title,
  em,
  sub,
  actions,
}: {
  title: string;
  em?: string;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="ph">
      <div>
        <h1>
          {title}
          {em ? <> <em>{em}</em></> : null}
        </h1>
        {sub ? <div className="sub">{sub}</div> : null}
      </div>
      <span className="sp" />
      {actions}
    </div>
  );
}

export function SecHead({ icon, title, right }: { icon?: IconName; title: string; right?: ReactNode }) {
  return (
    <h3>
      {icon ? <Ic name={icon} size={14} /> : null}
      {title}
      <span className="sp" />
      {right}
    </h3>
  );
}

/* ---------- loading / empty / error ---------- */

/** Skeleton block. Loading is never rendered as an empty state. */
export function Sk({ h = 16, w = "100%", mb = 10 }: { h?: number | string; width?: string; w?: string; mb?: number }) {
  return <div className="skel" style={{ height: h, width: w, marginBottom: mb }} />;
}

export function SkList({ rows = 4 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "11px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
          <div className="skel" style={{ width: 40, height: 40, borderRadius: 12 }} />
          <div style={{ flex: 1 }}>
            <Sk h={13} w="52%" mb={7} />
            <Sk h={11} w="34%" mb={0} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Emp({ icon = "info", title, note, action }: { icon?: IconName; title: string; note?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ico">
        <Ic name={icon} size={24} />
      </div>
      <h3>{title}</h3>
      {note ? <p>{note}</p> : null}
      {action}
    </div>
  );
}

/** Error + retry. Distinct from "empty" so a down API never reads as no data. */
export function Err({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="alert danger" role="alert">
      <Ic name="alertCircle" size={16} />
      <span style={{ flex: 1 }}>{msg}</span>
      {onRetry ? (
        <button type="button" className="reb-btn sm ghost" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

/* ---------- small display helpers ---------- */

export function Badge({ tone = "", children }: { tone?: "" | "ok" | "warn" | "danger" | "info" | "brand" | "accent"; children: ReactNode }) {
  return <span className={`badge${tone ? ` ${tone}` : ""}`}>{children}</span>;
}

export function Kv({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="kv">
      <b>{k}</b>
      <span>{children}</span>
    </div>
  );
}

/* ---------- overlays ---------- */

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

export function Modal({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div
      className="modal-wrap on"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {sub ? <p className="msub">{sub}</p> : null}
        {children}
        {footer ? <div className="mrow">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEscape(open, onClose);
  return (
    <>
      <div className={`drawer-scrim${open ? " on" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`drawer${open ? " on" : ""}`} role="dialog" aria-label="Details" aria-hidden={!open}>
        <div className="drawer-inner">{children}</div>
      </aside>
    </>
  );
}

/* ---------- exports ---------- */

/** Client-side CSV from data already loaded — there is no export endpoint. */
export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
