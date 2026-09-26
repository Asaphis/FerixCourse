"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap, ShieldCheck, Video, Infinity as InfinityIcon } from "lucide-react";
import { AuroraCanvas } from "./fx";
import { isSupabaseConfigured } from "@/lib/supabase";

export const inputCls = "mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-rose-400/60";

export function AuthFrame({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  const router = useRouter();
  const back = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-950 px-4 py-10">
      <AuroraCanvas variant="hero" />
      <div className="grain absolute inset-0" />
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-stone-900/80 shadow-[0_50px_120px_-30px_rgba(2,4,10,.95)] backdrop-blur-xl md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden p-9 md:flex">
          <AuroraCanvas variant="dense" />
          <p className="relative flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-rose-500 to-amber-400"><GraduationCap size={18} className="text-white" /></span>
            <span className="font-display text-lg font-bold">FerixCourse</span>
          </p>
          <div className="relative">
            <p className="font-display text-[26px] font-bold leading-tight">One account.<br />Every classroom.</p>
            <ul className="mt-6 space-y-3 text-[13.5px] text-slate-300">
              {[
                [Video, "Join live cohorts with real instructors"],
                [InfinityIcon, "Keep every session recording"],
                [ShieldCheck, "Verified, secure payments"],
              ].map(([Icon, t]: any) => (
                <li key={t} className="flex items-center gap-2.5"><Icon size={15} className="text-rose-300" /> {t}</li>
              ))}
            </ul>
          </div>
          <p className="relative text-[12px] text-slate-500">Learn technology. Ship real software.</p>
        </div>
        <div className="relative p-8 sm:p-10">
          <button onClick={back} className="group mb-5 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-2 text-[12.5px] font-semibold text-slate-300 transition hover:border-white/25 hover:text-white">
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" /> Back
          </button>
          <h1 className="font-display text-[26px] font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-400">{sub}</p>
          {children}
        </div>
      </div>
    </main>
  );
}

export function AuthError({ msg }: { msg: string }) {
  if (!msg) return null;
  return <p className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-200">{msg}</p>;
}

export function AuthOk({ msg }: { msg: string }) {
  if (!msg) return null;
  return <p className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-3.5 py-2.5 text-[13px] text-emerald-200">{msg}</p>;
}

export function safeNext(fallback = "/dashboard"): string {
  if (typeof window === "undefined") return fallback;
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}
export function AuthWarn() {
  if (isSupabaseConfigured()) return null;
  return <p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3.5 py-2.5 text-[12px] text-amber-200">Auth keys not set — add NEXT_PUBLIC_SUPABASE_URL / ANON_KEY to .env.local</p>;
}
