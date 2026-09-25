"use client";
import { motion } from "framer-motion";
import {
  ArrowRight, ArrowUpRight, BookOpen, CalendarCheck, Check, Mic, MicOff, MonitorUp, MonitorPlay,
  Play, Radio, ShieldCheck, Sparkles, UserCheck, Users, Video, MessageSquare, CircleDot, Wand2,
} from "lucide-react";
import Link from "next/link";

export const ease = [0.22, 1, 0.36, 1] as const;

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [...ease] as any }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">
      <span className="h-px w-6 bg-gradient-to-r from-transparent to-cyan-300/70" />
      {children}
    </p>
  );
}

export function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0A0F1E]/80 px-4 py-3 shadow-[0_20px_60px_-20px_rgba(2,6,23,.8)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 font-display text-sm font-extrabold text-white">F</span>
            <span className="font-display text-[17px] font-bold tracking-tight">FerixCourse</span>
          </Link>
          <nav className="hidden items-center gap-8 text-[13.5px] font-medium text-slate-400 lg:flex">
            <a href="#tracks" className="transition hover:text-white">Tracks</a>
            <a href="#method" className="transition hover:text-white">Method</a>
            <a href="#live" className="transition hover:text-white">Live classes</a>
            <a href="#featured" className="transition hover:text-white">Catalog</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden px-4 py-2 text-[13.5px] font-medium text-slate-300 transition hover:text-white sm:inline-flex">Log in</Link>
            <Link href="/register" className="group inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-[13.5px] font-semibold text-slate-950 transition hover:bg-slate-200">
              Get started
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

const SKILLS = [
  "React", "TypeScript", "Next.js", "Node.js", "PostgreSQL", "REST APIs",
  "React Native", "Python", "AI Engineering", "DevOps", "Docker", "Git",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-10 pt-36 sm:pt-44">
      <div className="grid-bg absolute inset-0" />
      <div className="absolute -top-48 left-1/2 h-[560px] w-[980px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/40 via-violet-500/25 to-cyan-400/30 blur-[130px]" />
      <div className="noise absolute inset-0 opacity-[0.5]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [...ease] as any }}>
            <Eyebrow>Practical technology training</Eyebrow>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08, ease: [...ease] as any }}
            className="mt-5 font-display text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-[68px]"
          >
            Learn technology.
            <br />
            <span className="text-gradient">Ship real software.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16, ease: [...ease] as any }}
            className="mt-6 max-w-xl text-[17px] leading-relaxed text-slate-400"
          >
            Instructor-led live classrooms, self-paced recorded courses, and private
            one-on-one mentorship — every path built around real projects, verified
            payments, and recordings you keep.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24, ease: [...ease] as any }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link href="/learn" className="group inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-[15px] font-semibold text-slate-950 shadow-[0_0_50px_-12px_rgba(255,255,255,.4)] transition hover:bg-slate-200">
              <Play size={17} className="fill-slate-950" />
              Explore training
            </Link>
            <Link href="/book" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition hover:border-white/30 hover:bg-white/10">
              <CalendarCheck size={17} />
              Book 1-on-1 training
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-9 flex flex-wrap gap-x-7 gap-y-2 text-[13px] text-slate-500"
          >
            {[
              { icon: Video, t: "HD live video + screen share" },
              { icon: ShieldCheck, t: "Verified secure payments" },
              { icon: Users, t: "Small cohorts, real instructors" },
            ].map((x) => (
              <span key={x.t} className="inline-flex items-center gap-1.5">
                <x.icon size={14} className="text-cyan-300/80" /> {x.t}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 34, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.2, ease: [...ease] as any }}
          className="relative"
        >
          <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-indigo-500/20 via-transparent to-cyan-400/15 blur-2xl" />
          <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-[#0B1122]/90 shadow-[0_40px_100px_-30px_rgba(2,6,23,.9)]">
            <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/15"><Radio size={12} className="text-rose-400" /></span>
              <p className="text-[13px] font-medium text-slate-200">Advanced JavaScript <span className="text-slate-500">— live classroom</span></p>
              <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> In session
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4">
              {[
                { n: "Instructor", on: true, tag: "Sharing screen" },
                { n: "You", on: true, tag: null },
                { n: "Ada", on: false, tag: null },
              ].map((p) => (
                <div key={p.n} className="relative flex h-28 flex-col justify-end overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-slate-800/60 to-slate-950 p-2">
                  {p.tag && <span className="absolute left-2 top-2 rounded-md bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-200">{p.tag}</span>}
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[10.5px] text-slate-300">{p.n}</span>
                    {p.on ? <Mic size={11} className="text-emerald-300" /> : <MicOff size={11} className="text-slate-500" />}
                  </div>
                </div>
              ))}
            </div>
            <div className="mx-4 rounded-2xl border border-white/8 bg-black/50 p-3.5 font-mono text-[12px] leading-relaxed">
              <p className="text-slate-500">// enrollment is payment-gated</p>
              <p><span className="text-cyan-300">await</span> <span className="text-slate-200">enroll</span><span className="text-slate-500">(</span><span className="text-amber-200">"js-live-cohort"</span><span className="text-slate-500">)</span></p>
              <p className="inline-flex items-center gap-1.5 text-emerald-300"><Check size={12} /> payment verified — classroom unlocked</p>
            </div>
            <div className="flex items-center gap-2 p-4">
              {[Mic, Video, MonitorUp, MessageSquare].map((Icon, i) => (
                <span key={i} className={`flex h-10 flex-1 items-center justify-center rounded-xl border ${i === 0 ? "border-white/15 bg-white/10" : "border-white/8 bg-white/[.04]"}`}>
                  <Icon size={16} className="text-slate-300" />
                </span>
              ))}
              <span className="flex h-10 flex-1 items-center justify-center rounded-xl bg-rose-500 text-[12.5px] font-semibold text-white">Leave</span>
            </div>
          </div>

          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl border border-white/12 bg-[#0D1428]/95 px-4 py-3 shadow-xl backdrop-blur sm:-left-8">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400"><Sparkles size={16} className="text-white" /></span>
            <div>
              <p className="text-[13px] font-semibold">Session recording saved</p>
              <p className="text-[11.5px] text-slate-400">Watch again anytime</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="relative mt-16 overflow-hidden border-y border-white/8 bg-white/[.015]">
        <div className="flex w-max animate-marquee items-center gap-9 whitespace-nowrap py-3.5 pr-9">
          {[...SKILLS, ...SKILLS].map((s, i) => (
            <span key={i} className="inline-flex items-center gap-2.5 text-[13px] font-medium text-slate-500">
              <CircleDot size={11} className="text-indigo-400/60" /> {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const TRACKS = [
  { icon: MonitorPlay, title: "Live training", desc: "Instructor-led cohorts with HD video, screen share, chat and automatic recordings.", href: "/classes", cta: "View live classes" },
  { icon: BookOpen, title: "Self-paced courses", desc: "Recorded lessons, resources and progress tracking. Learn on your schedule.", href: "/learn", cta: "View courses" },
  { icon: UserCheck, title: "One-on-one", desc: "Private online or in-person mentorship, scheduled around you.", href: "/book", cta: "Book training" },
  { icon: Wand2, title: "Custom training", desc: "Need something not listed? Request it — we build a classroom for you.", href: "/request", cta: "Request training" },
];

export function Tracks() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TRACKS.map((t, i) => (
        <Reveal key={t.title} delay={i * 0.07}>
          <Link href={t.href} className="group relative block h-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[.05] to-transparent p-7 transition duration-300 hover:-translate-y-1 hover:border-indigo-400/30 hover:shadow-[0_0_60px_-15px_rgba(99,102,241,.45)]">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition group-hover:border-indigo-400/40 group-hover:bg-indigo-500/15">
              <t.icon size={19} className="text-cyan-200" />
            </span>
            <h3 className="mt-5 font-display text-[19px] font-bold tracking-tight">{t.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-400">{t.desc}</p>
            <span className="mt-5 inline-flex items-center gap-1 text-[13.5px] font-semibold text-white">
              {t.cta} <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
