"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import AppShell from "@/components/shell";
import { apiFetch } from "@/lib/client";

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiFetch("/notifications/mine").then(setItems).catch((e) => setErr(e.message));
  }, []);

  return (
    <AppShell title="Notifications" sub="Payments, classes, recordings, messages — all in one place.">
      {err && <p className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{err}</p>}
      <div className="grid max-w-3xl gap-2.5">
        {items.map((n) => (
          <div key={n.id} className="flex gap-3 rounded-2xl border border-white/10 bg-night-900/70 px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15"><Bell size={15} className="text-fuchsia-200" /></span>
            <div>
              <p className="text-sm font-bold">{n.title}</p>
              {n.body && <p className="mt-0.5 text-[13px] text-slate-400">{n.body}</p>}
              <p className="mt-1 text-[11px] text-slate-600">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
        {!items.length && !err && (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <p className="font-display font-bold">All quiet for now.</p>
            <p className="mt-1 text-sm text-slate-400">Class reminders, new recordings and payment confirmations will land here.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
