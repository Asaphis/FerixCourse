import Link from "next/link";
import { Search, Radio, PlayCircle } from "lucide-react";
import AppShell from "@/components/shell";
import { getCourses, getClassrooms, getCategories, formatMoney } from "@/lib/api";

export const metadata = { title: "Catalog — FerixCourse" };

export default async function LearnPage({ searchParams }: { searchParams: { q?: string; level?: string; category?: string } }) {
  const q = searchParams.q ?? "";
  const level = searchParams.level ?? "";
  const category = searchParams.category ?? "";
  const params = `?search=${encodeURIComponent(q)}&level=${encodeURIComponent(level)}&category=${encodeURIComponent(category)}`;
  const [courses, rooms, cats] = await Promise.all([getCourses(params), getClassrooms(`?search=${encodeURIComponent(q)}&level=${encodeURIComponent(level)}`), getCategories()]);

  return (
    <AppShell title="Catalog" sub="Live cohorts and recorded courses. Everything listed is real and enrollable." publicPage>
      <form method="GET" className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-stone-900/70 p-3 sm:flex-row">
        <label className="flex flex-1 items-center gap-2 rounded-xl bg-black/40 px-3.5">
          <Search size={15} className="shrink-0 text-slate-500" />
          <input name="q" defaultValue={q} placeholder="Search training…" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-600" />
        </label>
        <select name="level" defaultValue={level} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none">
          <option value="">All levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option>
        </select>
        <select name="category" defaultValue={category} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none">
          <option value="">All categories</option>
          {cats.map((c: any) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <button className="btn-aurora rounded-xl px-5 py-2.5 text-sm font-bold text-white">Filter</button>
      </form>

      {rooms.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 flex items-center gap-2 font-display text-lg font-bold"><Radio size={17} className="text-rose-300" /> Live cohorts</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {rooms.map((r: any) => (
              <Link key={r.id} href={`/classrooms/${r.slug}`} className="card-lift rounded-2xl border border-white/10 bg-stone-900/70 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{r.level} · {r.enrolled}/{r.capacity} seats</p>
                <h3 className="mt-1.5 font-display text-[17px] font-bold">{r.title}</h3>
                <p className="mt-1 text-[13px] text-slate-400">{r.schedule_text || "Schedule announced"}</p>
                <p className="mt-3 font-display font-bold">{formatMoney(r.price_kobo, r.currency)}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 mt-8 flex items-center gap-2 font-display text-lg font-bold"><PlayCircle size={17} className="text-orange-300" /> Recorded courses</h2>
      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <p className="font-display font-bold">No courses match.</p>
          <p className="mt-1 text-sm text-slate-400">Try a different search — or request this topic and we will build it.</p>
          <Link href="/request" className="mt-4 inline-block rounded-xl border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/5">Request training</Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {courses.map((c: any) => (
            <Link key={c.id} href={`/courses/${c.slug}`} className="card-lift rounded-2xl border border-white/10 bg-stone-900/70 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{c.category} · {c.level} · {c.students} students</p>
              <h3 className="mt-1.5 font-display text-[17px] font-bold">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-[13px] text-slate-400">{c.short_description}</p>
              <p className="mt-3 font-display font-bold">{formatMoney(c.price_kobo, c.currency)}</p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
