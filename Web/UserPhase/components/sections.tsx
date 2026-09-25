"use client";
import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import Link from "next/link";
import {
  ArrowUpRight, BookOpen, CalendarCheck, MonitorPlay, UserCheck, Wand2,
  Check, Mic, MonitorUp, Video, MessageSquare, Radio, ShieldCheck, Infinity as InfinityIcon,
} from "lucide-react";
import { Reveal } from "./fx";
import { formatMoney } from "@/lib/api";

export function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setVal(Math.round(v)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

const TRACKS = [
  { icon: MonitorPlay, title: "Live training", desc: "Cohorts with HD video, screen share and automatic recordings.", href: "/live", cta: "Explore live" },
  { icon: BookOpen, title: "Self-paced courses", desc: "Recorded lessons and resources with progress tracking.", href: "/learn", cta: "Browse catalog" },
  { icon: UserCheck, title: "One-on-one", desc: "Private online or in-person mentorship on your schedule.", href: "/book", cta: "Book training" },
  { icon: Wand2, title: "Custom training", desc: "Need something unlisted? We build a classroom for you.", href: "/request", cta: "Request training" },
];

export function TrackTeasers() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TRACKS.map((t, i) => (
        <Reveal key={t.title} delay={i * 0.07}>
          <Link href={t.href} className="card-lift group block h-full rounded-3xl border border-white/10 bg-night-900/70 p-6 backdrop-blur">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-fuchsia-500/15 ring-1 ring-white/10 transition group-hover:from-violet-500/40 group-hover:to-fuchsia-500/30">
              <t.icon size={19} className="text-fuchsia-200" />
            </span>
            <h3 className="mt-5 font-display text-lg font-bold">{t.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-white">{t.cta}<ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

const STEPS = [
  ["Choose", "Pick a live cohort, a recorded course, or private mentorship."],
  ["Enroll", "Pay through verified checkout. Access unlocks on confirmation."],
  ["Build", "Attend live, rewatch recordings, ask questions, ship projects."],
  ["Prove", "Progress tracked lesson by lesson. Keep every recording."],
];

export function MethodTeasers() {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-4">
      {STEPS.map(([t, d], i) => (
        <Reveal key={t} delay={i * 0.07}>
          <div className="card-lift relative h-full overflow-hidden rounded-3xl border border-white/10 bg-night-900/70 p-6">
            <span className="pointer-events-none absolute -right-2 -top-5 font-display text-[88px] font-bold leading-none text-white/[.05]">0{i + 1}</span>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 ring-1 ring-emerald-300/20"><Check size={16} className="text-emerald-300" /></span>
            <h3 className="mt-4 font-display text-lg font-bold">{t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{d}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function LiveTeasers() {
  const feats = [
    { icon: Video, t: "Multi-camera classrooms" },
    { icon: MonitorUp, t: "Screen sharing" },
    { icon: MessageSquare, t: "Live chat + Q&A" },
    { icon: InfinityIcon, t: "Recordings you keep" },
    { icon: ShieldCheck, t: "Payment-gated access" },
    { icon: Radio, t: "Instructor controls" },
  ];
  return (
    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {feats.map((f, i) => (
        <Reveal key={f.t} delay={i * 0.05}>
          <div className="card-lift rounded-2xl border border-white/10 bg-night-900/70 p-4 text-center">
            <f.icon size={18} className="mx-auto text-amber-200" />
            <p className="mt-2.5 text-[12.5px] font-semibold leading-snug">{f.t}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function FeaturedGrid({ items }: { items: any[] }) {
  if (!items.length) {
    return (
      <Reveal>
        <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-white/[.02] p-10 text-center sm:p-14">
          <p className="font-display text-xl font-bold">Cohorts are being prepared</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            Nothing published yet. Create a free account and get notified the moment training opens.
          </p>
          <Link href="/register" className="btn-aurora mt-6 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white">
            Notify me <ArrowUpRight size={15} />
          </Link>
        </div>
      </Reveal>
    );
  }
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c, i) => (
        <Reveal key={c.id} delay={i * 0.06}>
          <Link href={`/courses/${c.slug}`} className="card-lift block h-full rounded-3xl border border-white/10 bg-night-900/70 p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{c.category} · {c.level}</p>
            <h3 className="mt-2.5 font-display text-lg font-bold leading-snug">{c.title}</h3>
            <p className="mt-2 line-clamp-2 text-[13.5px] text-slate-400">{c.short_description}</p>
            <p className="mt-4 font-display text-lg font-bold">{formatMoney(c.price_kobo, c.currency)}</p>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

export function ClassroomMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-br from-violet-600/25 via-transparent to-amber-400/15 blur-3xl" />
      <div className="grain relative overflow-hidden rounded-[28px] border border-white/12 bg-night-900/90 shadow-[0_50px_120px_-30px_rgba(2,4,10,.95)]">
        <div className="flex items-center gap-2.5 border-b border-white/8 px-5 py-4">
          <span className="relative flex h-2.5 w-2.5"><span className="absolute h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" /><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /></span>
          <p className="text-[13px] font-semibold">Advanced JavaScript <span className="font-normal text-slate-500">— live now</span></p>
          <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">12 in class</span>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4">
          {[{ n: "Instructor", live: true, tag: "Presenting" }, { n: "You", live: true, tag: null }, { n: "Ada", live: false, tag: null }].map((p) => (
            <div key={p.n} className="relative flex h-28 flex-col justify-end overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[.06] to-transparent p-2">
              {p.tag && <span className="absolute left-2 top-2 rounded-md bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-200">{p.tag}</span>}
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[10.5px] text-slate-300">{p.n}</span>
                {p.live ? <Mic size={11} className="text-emerald-300" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />}
              </div>
            </div>
          ))}
        </div>
        <div className="mx-4 rounded-2xl border border-white/8 bg-black/50 p-3.5 font-mono text-[12px] leading-relaxed">
          <p className="text-slate-600">// verified enrollment only</p>
          <p><span className="text-violet-300">await</span> <span className="text-slate-100">join</span><span className="text-slate-500">(</span><span className="text-amber-200">"js-live-cohort"</span><span className="text-slate-500">)</span></p>
        </div>
        <div className="flex items-center gap-2 p-4">
          {[Mic, Video, MonitorUp, MessageSquare].map((Icon, i) => (
            <span key={i} className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/[.05]"><Icon size={15} className="text-slate-300" /></span>
          ))}
          <span className="flex h-10 items-center rounded-xl bg-rose-500/90 px-5 text-[12.5px] font-bold">Leave</span>
        </div>
      </div>
      <div className="absolute -bottom-6 -right-3 animate-floaty rounded-2xl border border-white/12 bg-night-850/95 px-4 py-3 shadow-2xl backdrop-blur sm:-right-6">
        <p className="flex items-center gap-1.5 text-[12.5px] font-bold"><CalendarCheck size={14} className="text-emerald-300" /> Recording saved</p>
        <p className="mt-0.5 text-[11px] text-slate-400">Rewatch anytime</p>
      </div>
    </div>
  );
}
