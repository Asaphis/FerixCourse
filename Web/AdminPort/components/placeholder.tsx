"use client";
import { Shell } from "@/components/shell";

export default function Placeholder({ title, note }: { title?: string; note?: string }) {
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">{title ?? "Coming in next phase"}</h1>
      <p className="card mt-4 text-sm text-slate-400">{note ?? "This section is wired after the core admin flows are verified against live data."}</p>
    </Shell>
  );
}
