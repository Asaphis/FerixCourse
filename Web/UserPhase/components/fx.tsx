"use client";
import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1] as const;

/* Animated flowing-blobs canvas. `hues` re-themes each section.
   Pauses offscreen + honors prefers-reduced-motion. */
export function AuroraCanvas({ hues = ["139,92,246", "217,70,239", "251,191,36"], density = 4, className = "" }: {
  hues?: string[]; density?: number; className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let visible = true;
    const blobs = Array.from({ length: density }, (_, i) => ({
      hue: hues[i % hues.length],
      x: Math.random(), y: Math.random(),
      r: 0.28 + Math.random() * 0.3,
      sx: 0.0004 + Math.random() * 0.0009,
      sy: 0.0003 + Math.random() * 0.0008,
      px: Math.random() * Math.PI * 2,
      py: Math.random() * Math.PI * 2,
    }));

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(canvas);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      t += 1;
      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        const x = (b.x + Math.sin(t * b.sx * 60 + b.px) * 0.22) * W;
        const y = (b.y + Math.cos(t * b.sy * 60 + b.py) * 0.22) * H;
        const r = b.r * Math.max(W, H);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${b.hue},0.5)`);
        g.addColorStop(1, `rgba(${b.hue},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
    };
    draw();
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("resize", resize); };
  }, [hues.join(","), density]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}

/* Subtle drifting starfield for hero depth. */
export function Starfield({ count = 90, className = "" }: { count?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stars: HTMLSpanElement[] = [];
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      const size = Math.random() * 2 + 1;
      s.style.cssText = `position:absolute;border-radius:9999px;background:#fff;opacity:${0.15 + Math.random() * 0.5};width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation:floaty ${5 + Math.random() * 6}s ease-in-out ${Math.random() * 5}s infinite;`;
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

/* Section shell: themed animated backdrop + overlaid content. */
export function Section({ id, hues, children, tight = false }: { id?: string; hues?: string[]; children: React.ReactNode; tight?: boolean }) {
  return (
    <section id={id} className="relative overflow-hidden">
      <AuroraCanvas hues={hues} />
      <div className="grain absolute inset-0" />
      <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 ${tight ? "py-14" : "py-20 sm:py-28"}`}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.28em] text-fuchsia-200/90">
      <span className="h-px w-7 bg-gradient-to-r from-transparent to-fuchsia-300" />
      {children}
      <span className="h-px w-7 bg-gradient-to-l from-transparent to-fuchsia-300" />
    </p>
  );
}

/* Parallax glow orb that drifts on scroll. */
export function DriftOrb({ className = "", from = 0, to = -90 }: { className?: string; from?: number; to?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [from, to]);
  return <motion.div ref={ref} style={{ y }} aria-hidden className={`pointer-events-none absolute rounded-full blur-[100px] ${className}`} />;
}
