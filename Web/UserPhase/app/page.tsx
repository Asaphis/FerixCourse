import { Navbar, Hero } from "@/components/landing";
import { getFeatured, formatNaira } from "@/lib/api";
import { BookOpen, MonitorPlay, UserCheck, Wand2 } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const featured = await getFeatured();

  return (
    <main className="min-h-screen bg-ink-950">
      <Navbar />
      <Hero />

      <section id="training" className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold">Training that leads to <span className="text-gradient">real work</span></h2>
        <p className="text-slate-400 mt-2 max-w-2xl">Live cohorts for accountability, recorded courses for pace, private training for speed.</p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: MonitorPlay, t: "Live Training", d: "Instructor-led classrooms with video, screen share, chat and automatic recordings." },
            { icon: BookOpen, t: "Self-Paced Courses", d: "Recorded lessons, PDFs and code resources with progress tracking." },
            { icon: UserCheck, t: "One-on-One", d: "Private online or physical sessions, scheduled around you." },
            { icon: Wand2, t: "Custom Training", d: "Can't find it? Request it — we create a classroom for you." },
          ].map((c) => (
            <div key={c.t} className="glass rounded-3xl p-6 hover:border-brand-400/40 hover:shadow-glow transition group">
              <c.icon className="text-neon-cyan group-hover:scale-110 transition" />
              <h3 className="mt-4 font-display font-semibold text-lg">{c.t}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 to-ink-950 p-8 grid md:grid-cols-4 gap-6">
          {["Choose training","Enroll & pay securely","Learn live or at your pace","Build practical skills"].map((s, i) => (
            <div key={s} className="flex gap-4">
              <span className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-brand-500 to-neon-cyan flex items-center justify-center font-bold text-ink-950">{i+1}</span>
              <div><p className="font-semibold">{s}</p><p className="text-sm text-slate-400 mt-1">Step {i+1} of 4</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl font-bold">Featured training</h2>
          <Link href="/learn" className="text-sm text-brand-300 hover:text-white">View all →</Link>
        </div>
        {featured.length === 0 ? (
          <div className="mt-6 glass rounded-3xl p-10 text-center">
            <p className="font-display text-xl font-semibold">No courses available yet.</p>
            <p className="text-slate-400 text-sm mt-2">New cohorts and courses are being prepared. Create an account and we will notify you.</p>
            <Link href="/register" className="inline-flex mt-5 px-5 py-2.5 rounded-xl bg-white text-ink-950 font-semibold text-sm">Notify me</Link>
          </div>
        ) : (
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(featured as any[]).map((c) => (
              <div key={c.id} className="glass rounded-3xl p-5">
                <p className="text-xs text-slate-400">{c.category} • {c.level}</p>
                <h3 className="mt-1 font-display font-semibold">{c.title}</h3>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{c.short_description}</p>
                <p className="mt-3 font-bold">{formatNaira(c.price_kobo, c.currency)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl p-10 text-center bg-gradient-to-r from-brand-600 via-fuchsia-600 to-cyan-500">
          <div className="absolute inset-0 bg-ink-950/30" />
          <h2 className="relative font-display text-3xl sm:text-4xl font-extrabold">Start building real skills today.</h2>
          <p className="relative text-white/80 mt-2">Create an account, explore training, enroll securely.</p>
          <div className="relative mt-6 flex justify-center gap-3">
            <Link href="/register" className="px-6 py-3 rounded-2xl bg-white text-ink-950 font-semibold">Create account</Link>
            <Link href="/learn" className="px-6 py-3 rounded-2xl border border-white/40 font-semibold">Explore training</Link>
          </div>
        </div>
        <footer className="mt-10 flex flex-col sm:flex-row gap-3 justify-between text-xs text-slate-500 pb-24 md:pb-6">
          <span>© 2026 FerixCourse • Practical technology training</span>
          <span className="flex gap-4"><a href="#">About</a><a href="#">Contact</a><a href="#">Terms</a><a href="#">Privacy</a><a href="#">Support</a></span>
        </footer>
      </section>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50">
        <div className="m-3 glass rounded-2xl grid grid-cols-5 text-[11px] text-slate-300 py-2">
          {["Home","Learn","Classes","Messages","Profile"].map((t) => (
            <a key={t} href="#" className="flex flex-col items-center gap-1 py-1 hover:text-white"><span className="w-1.5 h-1.5 rounded-full bg-brand-400/60" />{t}</a>
          ))}
        </div>
      </nav>
    </main>
  );
}
