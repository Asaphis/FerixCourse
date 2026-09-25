"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      setUsers(await adminFetch(`/admin/users?search=${encodeURIComponent(q)}`));
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Users</h1>
      <div className="mt-4 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or name…" className="input max-w-sm" />
        <button onClick={load} className="btn-ghost">Search</button>
      </div>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      <div className="mt-4 grid gap-3">
        {users.map((u) => (
          <div key={u.id} className="card flex flex-wrap gap-3 items-center">
            <div className="min-w-0">
              <p className="font-semibold truncate">{u.full_name} <span className="text-xs text-slate-400">• {u.role}</span></p>
              <p className="text-xs text-slate-400">{u.email}</p>
            </div>
            <span className={`ml-auto text-xs px-2 py-1 rounded-full ${u.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
              {u.is_active ? "active" : "disabled"}
            </span>
          </div>
        ))}
        {!users.length && !err && <p className="card text-sm text-slate-400">No users found.</p>}
      </div>
    </Shell>
  );
}
