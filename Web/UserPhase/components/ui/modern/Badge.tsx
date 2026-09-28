import { type ReactNode } from "react";

export type Tone = "ok" | "warn" | "info" | "danger" | "neutral" | "brand";

const STATUS_TONES: Record<string, Tone> = {
  successful: "ok", success: "ok", paid: "ok", confirmed: "ok", completed: "ok",
  active: "ok", ready: "ok", accepted: "ok", verified: "ok", published: "ok",
  pending: "warn", reviewing: "warn", processing: "warn", queued: "warn", draft: "warn",
  failed: "danger", cancelled: "danger", canceled: "danger", rejected: "danger",
  expired: "danger", inactive: "danger", disabled: "danger", error: "danger",
  scheduled: "info", live: "info", streaming: "info", recorded: "info",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`fc-badge fc-badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status, label }: { status?: string | null; label?: string }) {
  const raw = String(status ?? "").trim();
  const tone: Tone = raw ? STATUS_TONES[raw.toLowerCase()] ?? "neutral" : "neutral";
  return <Badge tone={tone}>{label ?? (raw || "unknown")}</Badge>;
}