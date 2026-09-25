"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

const empty = { title: "", slug: "", level: "Beginner", price_kobo: 0, short_description: "" };

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      setCourses(await adminFetch("/admin/courses"));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await adminFetch("/admin/courses", { method: "POST", body: JSON.stringify(form) });
      setForm(empty); setMsg("Course created.");
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function toggle(c: any) {
    try {
      await adminFetch(`/admin/courses/${c.id}`, { method: "PATCH", body: JSON.stringify({ is_published: !c.is_published }) });
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Courses</h1>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      {msg && <p className="card mt-4 text-sm text-emerald-200">{msg}</p>}

      <form onSubmit={create} className="card mt-5 grid sm:grid-cols-2 gap-3">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Title" className="input" />
        <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required placeholder="slug-like-this" className="input" />
        <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="input">
          <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
        </select>
        <input value={form.price_kobo} onChange={(e) => setForm({ ...form, price_kobo: Number(e.target.value) })} type="number" min={0} placeholder="Price (kobo)" className="input" />
        <input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} placeholder="Short description" className="input sm:col-span-2" />
        <button className="btn sm:col-span-2">Create course</button>
      </form>

      <div className="mt-5 grid gap-3">
        {courses.map((c) => (
          <div key={c.id} className="card flex items-center gap-3">
            <div>
              <p className="font-semibold">{c.title} <span className="text-xs text-slate-400">• {c.level}</span></p>
              <p className="text-xs text-slate-400">{c.slug} • {(c.price_kobo / 100).toLocaleString()} {c.currency}</p>
            </div>
            <button onClick={() => toggle(c)} className="btn-ghost ml-auto text-xs">
              {c.is_published ? "Unpublish" : "Publish"}
            </button>
          </div>
        ))}
        {!courses.length && <p className="card text-sm text-slate-400">No courses yet — create the first one above.</p>}
      </div>
    </Shell>
  );
}
