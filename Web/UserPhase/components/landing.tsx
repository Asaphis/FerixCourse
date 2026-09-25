"use client";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, PlayCircle, Radio, Users } from "lucide-react";
import Link from "next/link";

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.6 } }),
};

export function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="glass mt-4 rounded-2xl px-4 py-3 flex items-center justify-between shadow-card">
          <Link href="/" className="font-display font-extrabold text-lg tracking-tight">
            <span className="font-extrabold">Ferix</span>
            <span className="text-gradient font-extrabold">Course</span>
          </Link>
          <nav className="hidden md:flex gap-7 text-sm text-slate-300">
            <a href="#training" className="hover:text-white">Training</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#live" className="hover:text-white">Live classes</a>
            <a href="#mentorship" className="hover:text-white">1-on-1</a>
          </nav>
          <div className="flex gap-2">
            <Link href="/login" className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm text-slate-200 hover:bg-white/10">Log in</Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 via-brand-500 to-neon-cyan text-white shadow-glow hover:opacity-95">
              Get started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-16">
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-3xl opacity-60 bg-gradient-to-r from-brand-600 via-fuchsia-500 to-neon-cyan animate-aurora" />
      <div className="absolute top-20 -left-32 w-96 h-96 rounded-full blur-3xl opacity-30 bg-brand-500 animate-aurora-slow" />

      <div className="relative mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <motion.div variants={fade} initial="hidden" animate="show" className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live cohorts + self-paced + 1-on-1 mentorship
          </motion.div>
          <motion.h1 variants={fade} initial="hidden" animate="show" custom={1} className="font-display font-extrabold text-5xl sm:text-6xl leading-[1.02] mt-5">
            Learn Technology.<br /><span className="text-gradient">Build Real Skills.</span>
          </motion.h1>
          <motion.p variants={fade} initial="hidden" animate="show" custom={2} className="mt-5 text-slate-300 text-lg max-w-xl">
            Join instructor-led live classrooms, learn at your own pace with recorded courses, or book private training — all with real projects and verified progress.
          </motion.p>
          <motion.div variants={fade} initial="hidden" animate="show" custom={3} className="mt-8 flex flex-wrap gap-3">
            <Link href="/learn" className="px-6 py-3.5 rounded-2xl font-semibold bg-white text-ink-950 hover:bg-slate-200 inline-flex items-center gap-2">
              <PlayCircle size={18} /> Explore Training
            </Link>
            <Link href="/book" className="px-6 py-3.5 rounded-2xl font-semibold glass hover:bg-white/10 inline-flex items-center gap-2">
              <CalendarCheck size={18} /> Book 1-on-1 Training
            </Link>
          </motion.div>
          <motion.div variants={fade} initial="hidden" animate="show" custom={4} className="mt-8 flex gap-6 text-sm text-slate-400">
            <span><b className="text-white">Live</b> video + screen share</span>
            <span><b className="text-white">Verified</b> payments</span>
            <span><b className="text-white">Real</b> recordings</span>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative">
          <div className="glass rounded-3xl p-5 shadow-card animate-floaty">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Radio size={14} className="text-rose-400" /> LIVE — Advanced JavaScript Classroom
              <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">15 seats</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["Instructor", "You", "Peer"].map((n) => (
                <div key={n} className="rounded-2xl h-28 bg-gradient-to-br from-ink-800 to-ink-900 border border-white/10 flex items-end p-2 text-xs text-slate-300">
                  <span className="px-2 py-0.5 rounded-full bg-black/50">{n}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-2xl bg-black/40 border border-white/10 p-3 font-mono text-xs text-slate-300">
              <span className="text-neon-cyan">$</span> await enroll("javascript-live")<br />
              <span className="text-emerald-300">✓ payment verified → classroom unlocked</span>
            </div>
            <div className="mt-3 flex gap-2">
              {["Mic", "Camera", "Share", "Chat"].map((c) => (
                <span key={c} className="flex-1 text-center text-xs px-2 py-2 rounded-xl bg-white/5 border border-white/10">{c}</span>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 glass rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
            <Users size={16} className="text-neon-cyan" /> Small cohorts, real instructors
          </div>
        </motion.div>
      </div>

      <div className="relative mt-14 border-y border-white/10 bg-white/[.02] overflow-hidden">
        <div className="flex gap-10 whitespace-nowrap py-3 text-sm text-slate-400 animate-marquee w-max">
          {Array(2).fill(["Web Development","Frontend","Backend","Mobile","Databases","APIs","AI Development","DevOps / Cloud","Programming Fundamentals"]).flat().map((t,i) => (
            <span key={i} className="inline-flex items-center gap-2">✦ {t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
