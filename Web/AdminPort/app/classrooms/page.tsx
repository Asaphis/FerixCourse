"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

const empty = { title: "", slug: "", level: "Beginner", price_kobo: 0, capacity: 30, schedule_text: "" };

export default function ClassroomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      setRooms(await adminFetch("/admin/classrooms"));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await adminFetch("/admin/classrooms", { method: "POST", body: JSON.stringify(form) });
      setForm(empty); setMsg("Classroom created.");
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function toggle(c: any) {
    try {
      await adminFetch(`/admin/classrooms/${c.id}`, { method: "PATCH", body: JSON.stringify({ is_published: !c.is_published }) });
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Classrooms</h1>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      {msg && <p className="card mt-4 text-sm text-emerald-200">{msg}</p>}

      <form onSubmit={create} className="card mt-5 grid sm:grid-cols-2 gap-3">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Title" className="input" />
        <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required placeholder="slug-like-this" className="input" />
        <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="input">
          <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
        </select>
        <input value={form.price_kobo} onChange={(e) => setForm({ ...form, price_kobo: Number(e.target.value) })} type="number" min={0} placeholder="Price (kobo)" className="input" />
        <input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} type="number" min={1} placeholder="Capacity" className="input" />
        <input value={form.schedule_text} onChange={(e) => setForm({ ...form, schedule_text: e.target.value })} placeholder="Schedule e.g. Tue + Thu 6pm" className="input" />
        <button className="btn sm:col-span-2">Create classroom</button>
      </form>

      <div className="mt-5 grid gap-3">
        {rooms.map((c) => (
          <div key={c.id} className="card flex items-center gap-3">
            <div>
              <p className="font-semibold">{c.title} <span className="text-xs text-slate-400">• {c.enrolled ?? 0}/{c.capacity} enrolled</span></p>
              <p className="text-xs text-slate-400">{c.slug} • {(c.price_kobo / 100).toLocaleString()} {c.currency} • {c.schedule_text}</p>
            </div>
            <div className="ml-auto flex gap-1.5">
              <Link href={`/classrooms/${c.id}`} className="btn-ghost text-xs">Manage</Link>
              <button onClick={() => toggle(c)} className="btn-ghost text-xs">
                {c.is_published ? "Unpublish" : "Publish"}
              </button>
            </div>
          </div>
        ))}
        {!rooms.length && <p className="card text-sm text-slate-400">No classrooms yet.</p>}
      </div>
    </Shell>
  );
}
