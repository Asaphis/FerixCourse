import { Navbar, Hero, Reveal, Eyebrow, Tracks } from "@/components/landing";
import { getFeatured, getCourses, getClassrooms, formatMoney } from "@/lib/api";
import { ArrowRight, ArrowUpRight, Lock } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const [featured, courses, rooms] = await Promise.all([getFeatured(), getCourses(), getClassrooms()]);
  const liveCount = rooms.length;
  const courseCount = courses.length;

  return (
    <main className="min-h-screen bg-[#060913] text-slate-100">
      <Navbar />
      <Hero />

      <section id="tracks" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal>
          <Eyebrow>Choose your path</Eyebrow>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <h2 className="max-w-xl font-display text-3xl font-extrabold tracking-[-0.02em] sm:text-[40px] sm:leading-[1.08]">
              Four ways to learn. One goal: <span className="text-gradient">real skill.</span>
            </h2>
            <Link href="/learn" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white">
              Browse the catalog <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
        <Tracks />
      </section>

      <section id="method" className="border-y border-white/8 bg-white/[.015]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[.9fr_1.1fr]">
          <Reveal>
            <Eyebrow>How FerixCourse works</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.02em] sm:text-[40px] sm:leading-[1.08]">
              From curious to capable in four steps.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-400">
              No fluff, no fake completions. You enroll through verified payment,
              learn with a real instructor or at your own pace, and leave with
              project work that proves the skill.
            </p>
            <div className="mt-7 flex gap-8">
              <div><p className="font-display text-3xl font-extrabold">{liveCount + courseCount}</p><p className="mt-1 text-xs text-slate-500">Published programs</p></div>
              <div><p className="font-display text-3xl font-extrabold">4</p><p className="mt-1 text-xs text-slate-500">Learning paths</p></div>
              <div><p className="font-display text-3xl font-extrabold">100%</p><p className="mt-1 text-xs text-slate-500">Project-based</p></div>
            </div>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["01", "Choose training", "Pick a live cohort, a recorded course, or private mentorship."],
              ["02", "Enroll securely", "Pay through verified checkout. Access unlocks only after confirmation."],
              ["03", "Learn for real", "Attend live, watch recordings, ask questions, build projects."],
              ["04", "Prove the skill", "Track progress lesson by lesson and keep every recording."],
            ].map(([n, t, d], i) => (
              <Reveal key={n} delay={i * 0.07}>
                <div className="h-full rounded-3xl border border-white/10 bg-[#0A0F1E] p-6">
                  <p className="font-display text-sm font-bold text-cyan-300/80">{n}</p>
                  <p className="mt-3 font-display text-[17px] font-bold">{t}</p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-slate-400">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="featured" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal>
          <Eyebrow>Catalog</Eyebrow>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em] sm:text-[40px]">Featured training</h2>
            <Link href="/learn" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white">
              View all <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
        {featured.length === 0 ? (
          <Reveal delay={0.1}>
            <div className="mt-8 overflow-hidden rounded-3xl border border-dashed border-white/15 bg-white/[.02] p-10 text-center sm:p-14">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><Lock size={19} className="text-slate-400" /></span>
              <p className="mt-5 font-display text-xl font-bold">Cohorts are being prepared</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                Nothing published yet. Create a free account and you will be notified
                the moment the first live classes and courses open.
              </p>
              <Link href="/register" className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-200">
                Notify me <ArrowUpRight size={15} />
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(featured as any[]).map((c, i) => (
              <Reveal key={c.id} delay={i * 0.06}>
                <Link href={`/courses/${c.slug}`} className="group block h-full rounded-3xl border border-white/10 bg-[#0A0F1E] p-6 transition hover:-translate-y-1 hover:border-indigo-400/30">
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">{c.category} · {c.level}</p>
                  <h3 className="mt-2.5 font-display text-[19px] font-bold leading-snug">{c.title}</h3>
                  <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-slate-400">{c.short_description}</p>
                  <p className="mt-4 font-display text-lg font-extrabold">{formatMoney(c.price_kobo, c.currency)}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 p-10 text-center sm:p-16">
            <div className="noise absolute inset-0" />
            <div className="absolute inset-0 bg-[#060913]/45" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-[-0.02em] sm:text-5xl sm:leading-[1.05]">
                Start building real skills today.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] text-white/75">
                Create a free account, explore the catalog, and enroll in your first
                live classroom or recorded course.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/register" className="rounded-2xl bg-white px-7 py-3.5 text-[15px] font-semibold text-slate-950 transition hover:bg-slate-200">Create free account</Link>
                <Link href="/learn" className="rounded-2xl border border-white/35 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10">Explore training</Link>
              </div>
            </div>
          </div>
        </Reveal>
        <footer className="flex flex-col gap-3 pb-24 pt-10 text-[12.5px] text-slate-600 sm:flex-row sm:items-center sm:justify-between md:pb-4">
          <span className="font-display font-bold text-slate-400">FerixCourse <span className="font-normal text-slate-600">— practical technology training</span></span>
          <span className="flex flex-wrap gap-x-5 gap-y-1">
            {["About", "Contact", "Training", "Terms", "Privacy", "Support"].map((l) => (
              <a key={l} href="#" className="transition hover:text-slate-300">{l}</a>
            ))}
          </span>
        </footer>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="m-3 grid grid-cols-5 rounded-2xl border border-white/10 bg-[#0A0F1E]/95 py-2 text-[10.5px] font-medium text-slate-400 backdrop-blur-xl">
          {[["Home", "/"], ["Learn", "/learn"], ["Classes", "/classes"], ["Messages", "/messages"], ["Profile", "/profile"]].map(([t, h]) => (
            <Link key={t} href={h} className="flex flex-col items-center gap-1 py-1.5 transition hover:text-white">
              <span className="h-1 w-1 rounded-full bg-indigo-400/70" />{t}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
