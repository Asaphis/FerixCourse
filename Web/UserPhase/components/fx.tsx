"use client";
import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Brackets3D, Braces3D, Laptop3D, Rocket3D, GradCap3D, Bulb3D,
  Gear3D, Target3D, Play3D, Lock3D, Database3D, Cloud3D,
} from "./objects3d";

export const EASE = [0.22, 1, 0.36, 1] as const;

/* ---------- Dice ---------- */
const PIPS: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function DieFace({ value, size, dark }: { value: number; size: number; dark?: boolean }) {
  const half = size / 2;
  const faces: [number, string][] = [
    [1, `translateZ(${half}px)`],
    [6, `rotateY(180deg) translateZ(${half}px)`],
    [2, `rotateY(90deg) translateZ(${half}px)`],
    [5, `rotateY(-90deg) translateZ(${half}px)`],
    [3, `rotateX(90deg) translateZ(${half}px)`],
    [4, `rotateX(-90deg) translateZ(${half}px)`],
  ];
  return (
    <>
      {faces.map(([v, t]) => (
        <div key={v} className={`die-face${dark ? " die-dark" : ""}`} style={{ width: size, height: size, transform: t }}>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i}>{PIPS[value].includes(i) && <span className="die-pip block" />}</span>
          ))}
        </div>
      ))}
    </>
  );
}

export function Die({ size = 92, dark = false, spin = "slow", className = "" }: { size?: number; dark?: boolean; spin?: "slow" | "slower"; className?: string }) {
  return (
    <div className={`obj-scene ${className}`} style={{ width: size, height: size }}>
      <div className={`die ${spin === "slow" ? "obj-spin-slow" : "obj-spin-slower"}`} style={{ width: size, height: size }}>
        <DieFace value={3} size={size} dark={dark} />
      </div>
    </div>
  );
}

/* ---------- Other objects ---------- */
export function OrbBall({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={className} style={{ width: size }}>
      <div className="orb-ball" style={{ width: size, height: size }} />
      <div className="orb-shadow mx-auto mt-2" style={{ width: size * 0.7, height: 14 }} />
    </div>
  );
}

export function Ring3D({ size = 150, thick = 14, className = "" }: { size?: number; thick?: number; className?: string }) {
  return <div className={`ring-3d ${className}`} style={{ width: size, height: size, borderWidth: thick }} />;
}

export function Capsule({ w = 150, h = 44, className = "", tilt = -24 }: { w?: number; h?: number; className?: string; tilt?: number }) {
  return <div className={`capsule-3d ${className}`} style={{ width: w, height: h, transform: `rotate(${tilt}deg)` }} />;
}

export function Plus({ size = 18, className = "", color = "rgba(255,255,255,.22)" }: { size?: number; className?: string; color?: string }) {
  return <div className={`plus-mark ${className}`} style={{ width: size, height: size, color }} />;
}

/* ---------- Object field: themed floating objects per section ---------- */
type ObjSpec =
  | { k: "die"; x: string; y: string; size: number; dark?: boolean; spin?: "slow" | "slower"; d: number; dur: number; o?: number }
  | { k: "orb"; x: string; y: string; size: number; d: number; dur: number; o?: number }
  | { k: "ring"; x: string; y: string; size: number; d: number; dur: number; o?: number }
  | { k: "cap"; x: string; y: string; w: number; d: number; dur: number; o?: number }
  | { k: "plus"; x: string; y: string; size: number; d: number; dur: number; o?: number }
  | { k: "3d"; x: string; y: string; what: "brackets" | "braces" | "laptop" | "rocket" | "gradcap" | "bulb" | "gear" | "target" | "play" | "lock" | "db" | "cloud"; scale: number; d: number; dur: number; o?: number };

const SETS: Record<string, ObjSpec[]> = {
  hero: [
    { k: "die", x: "6%", y: "16%", size: 96, d: 0, dur: 7 },
    { k: "3d", what: "brackets", x: "80%", y: "12%", scale: 1.1, d: 0.4, dur: 8 },
    { k: "ring", x: "76%", y: "8%", size: 150, d: 1.2, dur: 9, o: 0.7 },
    { k: "orb", x: "88%", y: "60%", size: 100, d: 0.6, dur: 8 },
    { k: "3d", what: "rocket", x: "62%", y: "66%", scale: 0.9, d: 1.1, dur: 9 },
    { k: "cap", x: "3%", y: "68%", w: 140, d: 2, dur: 10, o: 0.8 },
    { k: "3d", what: "laptop", x: "30%", y: "78%", scale: 0.85, d: 0.8, dur: 10, o: 0.95 },
    { k: "die", x: "68%", y: "76%", size: 52, dark: true, spin: "slower", d: 1.6, dur: 8 },
    { k: "3d", what: "bulb", x: "45%", y: "8%", scale: 0.9, d: 2.2, dur: 7 },
    { k: "3d", what: "braces", x: "27%", y: "24%", scale: 0.8, d: 1.1, dur: 8, o: 0.9 },
    { k: "die", x: "15%", y: "52%", size: 48, dark: true, spin: "slow", d: 2.6, dur: 7, o: 0.9 },
    { k: "3d", what: "gear", x: "52%", y: "14%", scale: 0.7, d: 0.9, dur: 10, o: 0.7 },
    { k: "3d", what: "play", x: "36%", y: "62%", scale: 0.8, d: 1.9, dur: 7, o: 0.85 },
    { k: "plus", x: "24%", y: "14%", size: 18, d: 0, dur: 6 },
    { k: "plus", x: "55%", y: "86%", size: 14, d: 1, dur: 7 },
    { k: "plus", x: "92%", y: "38%", size: 20, d: 2, dur: 6 },
  ],
  scatter: [
    { k: "ring", x: "85%", y: "8%", size: 130, d: 0, dur: 9, o: 0.55 },
    { k: "3d", what: "braces", x: "6%", y: "18%", scale: 0.9, d: 0.7, dur: 8, o: 0.9 },
    { k: "die", x: "4%", y: "55%", size: 60, dark: true, d: 1, dur: 8, o: 0.9 },
    { k: "3d", what: "gradcap", x: "78%", y: "70%", scale: 0.95, d: 1.4, dur: 9, o: 0.9 },
    { k: "orb", x: "12%", y: "76%", size: 72, d: 0.5, dur: 9, o: 0.8 },
    { k: "3d", what: "gear", x: "60%", y: "10%", scale: 0.85, d: 2, dur: 10, o: 0.75 },
    { k: "plus", x: "70%", y: "82%", size: 16, d: 0, dur: 7 },
    { k: "plus", x: "40%", y: "6%", size: 14, d: 1.4, dur: 6 },
  ],
  dense: [
    { k: "die", x: "4%", y: "12%", size: 80, d: 0, dur: 7 },
    { k: "3d", what: "cloud", x: "86%", y: "14%", scale: 0.9, d: 0.5, dur: 9, o: 0.9 },
    { k: "die", x: "90%", y: "52%", size: 56, dark: true, spin: "slower", d: 1, dur: 9 },
    { k: "3d", what: "lock", x: "70%", y: "68%", scale: 0.9, d: 1.3, dur: 8 },
    { k: "ring", x: "74%", y: "62%", size: 140, d: 0.4, dur: 10, o: 0.6 },
    { k: "3d", what: "db", x: "10%", y: "64%", scale: 0.95, d: 0.9, dur: 9 },
    { k: "orb", x: "30%", y: "82%", size: 84, d: 1.2, dur: 8, o: 0.85 },
    { k: "3d", what: "target", x: "46%", y: "6%", scale: 0.85, d: 0.2, dur: 8, o: 0.8 },
    { k: "3d", what: "play", x: "20%", y: "30%", scale: 0.9, d: 1.8, dur: 7, o: 0.9 },
    { k: "cap", x: "55%", y: "88%", w: 120, d: 0, dur: 9, o: 0.7 },
    { k: "plus", x: "62%", y: "30%", size: 14, d: 1.8, dur: 7 },
    { k: "plus", x: "35%", y: "45%", size: 18, d: 0.3, dur: 8 },
  ],
};

const D3: Record<string, (p: { scale: number }) => JSX.Element> = {
  brackets: (p) => <Brackets3D scale={p.scale} />,
  braces: (p) => <Braces3D scale={p.scale} />,
  laptop: (p) => <Laptop3D scale={p.scale} />,
  rocket: (p) => <Rocket3D scale={p.scale} />,
  gradcap: (p) => <GradCap3D scale={p.scale} />,
  bulb: (p) => <Bulb3D scale={p.scale} />,
  gear: (p) => <Gear3D scale={p.scale} />,
  target: (p) => <Target3D scale={p.scale} />,
  play: (p) => <Play3D scale={p.scale} />,
  lock: (p) => <Lock3D scale={p.scale} />,
  db: (p) => <Database3D scale={p.scale} />,
  cloud: (p) => <Cloud3D scale={p.scale} />,
};

function renderObj(o: ObjSpec, i: number) {
  const style: React.CSSProperties = {
    position: "absolute", left: o.x, top: o.y,
    animationDelay: `${o.d}s`, animationDuration: `${o.dur}s`,
    opacity: o.o ?? 1,
  };
  return (
    <div key={i} className="obj-float" style={style}>
      {o.k === "die" && <Die size={o.size} dark={o.dark} spin={o.spin} />}
      {o.k === "orb" && <OrbBall size={o.size} />}
      {o.k === "ring" && <Ring3D size={o.size} />}
      {o.k === "cap" && <Capsule w={o.w} />}
      {o.k === "plus" && <Plus size={o.size} />}
      {o.k === "3d" && (() => {
        const C = D3[o.what];
        return <C scale={o.scale} />;
      })()}
    </div>
  );
}

export function ObjectField({ variant = "scatter", className = "" }: { variant?: keyof typeof SETS; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      (el as HTMLElement).style.setProperty("--play", e.isIntersecting ? "running" : "paused");
      el.querySelectorAll(".obj-float,.obj-spin-slow,.obj-spin-slower").forEach((n) => {
        ((n as HTMLElement).style as any).animationPlayState = e.isIntersecting ? "running" : "paused";
      });
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <motion.div ref={ref} style={{ y }} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {(SETS[variant] ?? SETS.scatter).map(renderObj)}
    </motion.div>
  );
}

/* Backwards-compatible name: previously gradient blobs, now objects. */
export function AuroraCanvas({ variant = "scatter", className = "" }: { hues?: string[]; density?: number; variant?: keyof typeof SETS; className?: string }) {
  return <ObjectField variant={variant} className={className} />;
}

export function Starfield({ count = 70, className = "" }: { count?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stars: HTMLSpanElement[] = [];
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      const size = Math.random() * 2 + 1;
      s.style.cssText = `position:absolute;border-radius:9999px;background:#fff;opacity:${0.1 + Math.random() * 0.4};width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation:objFloat ${5 + Math.random() * 6}s ease-in-out ${Math.random() * 5}s infinite;`;
      el.appendChild(s);
      stars.push(s);
    }
    return () => stars.forEach((s) => s.remove());
  }, [count]);
  return <div ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} />;
}

export function Reveal({ children, delay = 0, y = 30, className }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.75, delay, ease: [...EASE] as any }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Section({ id, word, children, tight = false, variant = "scatter" }: {
  id?: string; word?: string; children: React.ReactNode; tight?: boolean; variant?: keyof typeof SETS;
}) {
  return (
    <section id={id} className="relative overflow-hidden">
      <ObjectField variant={variant} />
      {word && (
        <span aria-hidden className="outline-word pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 text-[18vw] leading-none opacity-70">
          {word}
        </span>
      )}
      <div className="grain absolute inset-0" />
      <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 ${tight ? "py-14" : "py-20 sm:py-28"}`}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[.04] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#ffb27a] backdrop-blur">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
      {children}
    </p>
  );
}

export function DriftOrb({ className = "", from = 0, to = -90 }: { className?: string; from?: number; to?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [from, to]);
  return <motion.div ref={ref} style={{ y }} aria-hidden className={`pointer-events-none absolute rounded-full blur-[100px] ${className}`} />;
}
