"use client";
import { useEffect, useMemo, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Dices, Box, CodeXml, Braces, Laptop, Monitor, Keyboard, Mouse, SquareTerminal,
  AppWindow, Database, Server, Cloud, BookOpen, NotebookPen, Pencil, GraduationCap,
  Award, Lightbulb, Brain, Bookmark, Puzzle, Cog, Target, Mic, Webcam, Play,
  Smartphone, Headphones, Calculator, Clock, Calendar, Folder, FileText, Search,
  Rocket, Globe, Lock, KeyRound, CircuitBoard, Network, Wifi, MessageCircle, Bell,
  Usb, HardDrive, Gamepad2, Layers, Webhook, GitBranch, Brackets, Triangle, Hexagon,
  Diamond, Star, Trophy, Bot, Palette, Compass, Zap, Timer, SquareCode, Cpu, Camera, Fingerprint,
} from "lucide-react";
import { Die, OrbBall, Ring3D } from "./fx";

/* Every object the wallpaper can draw — your list + 6 suggestions
   (Trophy, Bot, Palette, Compass, Zap, Timer). */
const REGISTRY: { icon: LucideIcon; cat: "code" | "learn" | "media" | "sys" | "shape" }[] = [
  { icon: Dices, cat: "shape" }, { icon: Box, cat: "shape" }, { icon: CodeXml, cat: "code" },
  { icon: Braces, cat: "code" }, { icon: Laptop, cat: "sys" }, { icon: Monitor, cat: "sys" },
  { icon: Keyboard, cat: "sys" }, { icon: Mouse, cat: "sys" }, { icon: SquareTerminal, cat: "code" },
  { icon: AppWindow, cat: "code" }, { icon: Database, cat: "code" }, { icon: Server, cat: "sys" },
  { icon: Cloud, cat: "sys" }, { icon: BookOpen, cat: "learn" }, { icon: NotebookPen, cat: "learn" },
  { icon: Pencil, cat: "learn" }, { icon: GraduationCap, cat: "learn" }, { icon: Award, cat: "learn" },
  { icon: Lightbulb, cat: "learn" }, { icon: Brain, cat: "learn" }, { icon: Bookmark, cat: "learn" },
  { icon: Puzzle, cat: "shape" }, { icon: Cog, cat: "sys" }, { icon: Target, cat: "shape" },
  { icon: Mic, cat: "media" }, { icon: Webcam, cat: "media" }, { icon: Play, cat: "media" },
  { icon: Smartphone, cat: "sys" }, { icon: Headphones, cat: "media" }, { icon: Calculator, cat: "learn" },
  { icon: Clock, cat: "sys" }, { icon: Calendar, cat: "sys" }, { icon: Folder, cat: "sys" },
  { icon: FileText, cat: "code" }, { icon: Search, cat: "sys" }, { icon: Rocket, cat: "shape" },
  { icon: Globe, cat: "sys" }, { icon: Lock, cat: "code" }, { icon: KeyRound, cat: "code" },
  { icon: CircuitBoard, cat: "code" }, { icon: Network, cat: "code" }, { icon: Wifi, cat: "sys" },
  { icon: MessageCircle, cat: "media" }, { icon: Bell, cat: "media" }, { icon: Usb, cat: "sys" },
  { icon: HardDrive, cat: "sys" }, { icon: Gamepad2, cat: "media" }, { icon: Layers, cat: "code" },
  { icon: Webhook, cat: "code" }, { icon: GitBranch, cat: "code" }, { icon: Brackets, cat: "code" },
  { icon: Triangle, cat: "shape" }, { icon: Hexagon, cat: "shape" }, { icon: Diamond, cat: "shape" },
  { icon: Star, cat: "shape" }, { icon: Trophy, cat: "learn" }, { icon: Bot, cat: "code" },
  { icon: Palette, cat: "media" }, { icon: Compass, cat: "shape" }, { icon: Zap, cat: "shape" },
  { icon: Timer, cat: "sys" }, { icon: SquareCode, cat: "code" }, { icon: Cpu, cat: "code" },
  { icon: Camera, cat: "media" }, { icon: Fingerprint, cat: "code" },
];

const TINTS = [
  "text-stone-600", "text-stone-600", "text-stone-500", "text-stone-500",
  "text-orange-500/70", "text-amber-300/70", "text-rose-400/60", "text-emerald-300/60",
];

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Cell =
  | { k: "icon"; Icon: LucideIcon; size: number; tint: string; rx: number; ry: number; delay: number; dur: number; dim: number; blur: number }
  | { k: "die"; size: number; dark: boolean; delay: number; dur: number }
  | { k: "orb"; size: number; delay: number; dur: number }
  | { k: "ring"; size: number; delay: number; dur: number };

function buildCells(seed: number, count: number, cats?: string[]): Cell[] {
  const rnd = mulberry(seed);
  const pool = cats?.length ? REGISTRY.filter((r) => cats.includes(r.cat)) : REGISTRY;
  const cells: Cell[] = [];
  for (let i = 0; i < count; i++) {
    const delay = rnd() * 6;
    const dur = 6 + rnd() * 6;
    // Every 8th cell is a true 3D object (dice / sphere / ring)
    if (i % 8 === 7) {
      const pick = rnd();
      if (pick < 0.4) cells.push({ k: "die", size: 44 + rnd() * 28, dark: rnd() > 0.5, delay, dur });
      else if (pick < 0.7) cells.push({ k: "orb", size: 40 + rnd() * 30, delay, dur });
      else cells.push({ k: "ring", size: 52 + rnd() * 30, delay, dur });
      continue;
    }
    cells.push({
      k: "icon",
      Icon: pool[Math.floor(rnd() * pool.length)].icon,
      size: 30 + rnd() * 26,
      tint: TINTS[Math.floor(rnd() * TINTS.length)],
      rx: -14 + rnd() * 28,
      ry: -18 + rnd() * 36,
      delay, dur,
      dim: 0.5 + rnd() * 0.5,
      blur: rnd() > 0.82 ? 1.5 : 0,
    });
  }
  return cells;
}

export function ObjectWallpaper({ variant = "scatter", seed = 7, cats, className = "" }: {
  variant?: "hero" | "dense" | "scatter";
  seed?: number;
  cats?: ("code" | "learn" | "media" | "sys" | "shape")[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [46, -46]);

  const count = variant === "hero" ? 84 : variant === "dense" ? 60 : 44;
  const cells = useMemo(() => buildCells(seed, count, cats), [seed, count, cats?.join(",")]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      el.querySelectorAll(".obj-float").forEach((n) => {
        ((n as HTMLElement).style as any).animationPlayState = e.isIntersecting ? "running" : "paused";
      });
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <motion.div ref={ref} style={{ y }} aria-hidden className={`pointer-events-none absolute -inset-4 ${className}`}>
      <div className="grid h-full w-full content-start gap-3 overflow-hidden p-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))" }}>
        {cells.map((c, i) =>
          c.k === "icon" ? (
            <div key={i} className="obj-float flex aspect-square items-center justify-center rounded-2xl border border-white/[.07] bg-gradient-to-br from-white/[.07] to-transparent shadow-[0_12px_32px_-14px_rgba(0,0,0,.9)]"
              style={{
                animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`,
                opacity: c.dim, filter: c.blur ? `blur(${c.blur}px)` : undefined,
                transform: `perspective(500px) rotateX(${c.rx}deg) rotateY(${c.ry}deg)`,
              }}>
              <c.Icon size={c.size} strokeWidth={1.5} className={c.tint} />
            </div>
          ) : (
            <div key={i} className="obj-float flex aspect-square items-center justify-center"
              style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }}>
              {c.k === "die" && <Die size={c.size} dark={c.dark} spin={i % 2 ? "slower" : "slow"} />}
              {c.k === "orb" && <OrbBall size={c.size} />}
              {c.k === "ring" && <Ring3D size={c.size} thick={10} />}
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}
