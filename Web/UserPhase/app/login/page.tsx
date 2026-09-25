"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthFrame, AuthError, AuthWarn, inputCls } from "@/components/auth";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const { error } = await supabase().auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
      router.push("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Welcome back" sub="Log in to rejoin your classrooms.">
      <AuthWarn />
      <AuthError msg={err} />
      <form onSubmit={submit} className="mt-6 space-y-3.5">
        <label className="block text-[13px] font-medium">Email<input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="you@example.com" className={inputCls} /></label>
        <label className="block text-[13px] font-medium">Password<input value={pw} onChange={(e) => setPw(e.target.value)} required type="password" placeholder="Your password" className={inputCls} /></label>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-[12.5px] font-semibold text-slate-400 hover:text-white">Forgot password?</Link>
        </div>
        <button disabled={busy} className="btn-aurora group flex w-full items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Logging in…" : <>Log in <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></>}
        </button>
      </form>
      <p className="mt-5 text-center text-[13px] text-slate-400">No account? <Link href="/register" className="font-bold text-white">Create one</Link></p>
    </AuthFrame>
  );
}
