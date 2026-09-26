"use client";
import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import Link from "next/link";
import {
  ArrowUpRight, BookOpen, CalendarCheck, MonitorPlay, UserCheck, Wand2,
  Check, Mic, MonitorUp, Video, MessageSquare, Radio, ShieldCheck, Infinity as InfinityIcon,
  Users, Play,
} from "lucide-react";
import { Reveal } from "./fx";
import { Die, OrbBall, Ring3D } from "./fx";
import { Laptop3D, Rocket3D, Bulb3D } from "./objects3d";
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
  { icon: MonitorPlay, title: "Live training", desc: "Fixed schedules, capped seats, cameras on. Miss nothing — every session is recorded.", href: "/live", cta: "See live classes" },
  { icon: BookOpen, title: "Self-paced courses", desc: "Start tonight, finish on your terms. Progress tracked, resources included.", href: "/learn", cta: "Browse courses" },
  { icon: UserCheck, title: "One-on-one", desc: "One instructor, entirely focused on you. Online or in person.", href: "/book", cta: "Book a session" },
  { icon: Wand2, title: "Custom training", desc: "Your stack, your schedule. We design the classroom around your goal.", href: "/request", cta: "Request it" },
];

export function TrackTeasers() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TRACKS.map((t, i) => (
        <Reveal key={t.title} delay={i * 0.07}>
          <Link href={t.href} className="card-lift group block h-full rounded-3xl border border-white/10 bg-stone-900/70 p-6 backdrop-blur">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/25 to-rose-500/15 ring-1 ring-white/10 transition group-hover:from-orange-500/40 group-hover:to-rose-500/30">
              <t.icon size={19} className="text-rose-200" />
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
  ["Pick your path", "Live cohort, recorded course, or mentor — filter by level, topic and schedule."],
  ["Lock your seat", "Verified checkout, instant confirmation. Free programs enroll on the spot."],
  ["Do the work", "Attend live, rewatch recordings, ask anything, ship projects."],
  ["Show receipts", "Lesson progress, attendance and recordings document exactly what you can do."],
];

export function MethodTeasers() {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-4">
      {STEPS.map(([t, d], i) => (
        <Reveal key={t} delay={i * 0.07}>
          <div className="card-lift relative h-full overflow-hidden rounded-3xl border border-white/10 bg-stone-900/70 p-6">
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
    { icon: ShieldCheck, t: "Secure enrollment" },
    { icon: Radio, t: "Instructor controls" },
  ];
  return (
    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {feats.map((f, i) => (
        <Reveal key={f.t} delay={i * 0.05}>
          <div className="card-lift rounded-2xl border border-white/10 bg-stone-900/70 p-4 text-center">
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
          <p className="font-display text-xl font-bold">First cohorts loading</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            The opening lineup is being prepared. Join free and get notified the moment seats open.
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
          <Link href={`/courses/${c.slug}`} className="card-lift block h-full rounded-3xl border border-white/10 bg-stone-900/70 p-6">
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

export function DeskScene({ openCohorts }: { openCohorts: number }) {
  return (
    <div className="grain relative h-[440px] overflow-hidden rounded-[28px] border border-white/12 bg-stone-900/60 sm:h-[500px]">
      <div className="absolute inset-0"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.13) 1px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
      <div className="obj-float absolute" style={{ left: "6%", bottom: "10%", animationDuration: "9s" }}>
        <Laptop3D scale={1.2} />
      </div>
      <div className="obj-float absolute" style={{ right: "8%", top: "6%", animationDuration: "7s", animationDelay: "1s" }}>
        <Die size={104} />
      </div>
      <div className="obj-float absolute" style={{ right: "30%", bottom: "4%", animationDuration: "8s", animationDelay: "0.5s" }}>
        <Rocket3D scale={0.95} />
      </div>
      <div className="obj-float absolute" style={{ left: "40%", top: "5%", animationDuration: "7.5s", animationDelay: "2s" }}>
        <Bulb3D scale={0.8} />
      </div>
      <div className="absolute" style={{ left: "56%", top: "32%", opacity: 0.65 }}>
        <Ring3D size={120} thick={11} />
      </div>
      <div className="obj-float absolute" style={{ right: "4%", bottom: "26%", animationDuration: "9s", animationDelay: "1.4s" }}>
        <OrbBall size={64} />
      </div>
      <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/12 bg-black/60 px-3.5 py-2 text-[12px] font-bold backdrop-blur">
        <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="h-2 w-2 rounded-full bg-emerald-400" /></span>
        {openCohorts > 0 ? `${openCohorts} cohort${openCohorts === 1 ? "" : "s"} open` : "New cohorts forming"}
      </div>
      <div className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-2xl border border-white/12 bg-black/60 px-4 py-2.5 backdrop-blur">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500"><Play size={14} className="fill-white text-white" /></span>
        <span><span className="block text-[12.5px] font-bold">Every session recorded</span><span className="block text-[11px] text-stone-400">Rewatch forever</span></span>
      </div>
      <div className="absolute bottom-4 right-4 hidden items-center gap-2 rounded-2xl border border-white/12 bg-black/60 px-4 py-2.5 backdrop-blur sm:flex">
        <Users size={15} className="text-amber-300" />
        <span className="text-[12.5px] font-bold">Small cohorts, real humans</span>
      </div>
    </div>
  );
}
