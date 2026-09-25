"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    adminFetch("/admin/notifications").then(setItems).catch((e) => setErr(e.message));
  }, []);
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Notifications</h1>
      <p className="text-sm text-slate-400 mt-1">System-generated events (request/booking updates today; payments, classes, recordings as phases land).</p>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      <div className="mt-4 grid gap-2">
        {items.map((n) => (
          <p key={n.id} className="card text-sm"><b>{n.title}</b> <span className="text-xs text-slate-400">• {n.type} • {n.user_email}</span><br />{n.body}</p>
        ))}
        {!items.length && !err && <p className="card text-sm text-slate-400">No notifications yet.</p>}
      </div>
    </Shell>
  );
}
