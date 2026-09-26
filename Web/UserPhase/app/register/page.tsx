"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthFrame, AuthError, AuthWarn, inputCls, safeNext } from "@/components/auth";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [qs, setQs] = useState("");
  useEffect(() => { setQs(window.location.search); }, []);
  const [f, setF] = useState({ name: "", email: "", pw: "", pw2: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (f.pw !== f.pw2) return setErr("Passwords do not match.");
    if (f.pw.length < 8) return setErr("Password must be at least 8 characters.");
    setBusy(true);
    try {
      const { error } = await supabase().auth.signUp({ email: f.email, password: f.pw, options: { data: { full_name: f.name } } });
      if (error) throw error;
      router.push(safeNext());
    } catch (e: any) {
      setErr(e?.message ?? "Registration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Create your account" sub="Free to join. Pay only when you enroll.">
      <AuthWarn />
      <AuthError msg={err} />
      <form onSubmit={submit} className="mt-6 space-y-3.5">
        <label className="block text-[13px] font-medium">Full name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required placeholder="Ada Lovelace" className={inputCls} /></label>
        <label className="block text-[13px] font-medium">Email<input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required type="email" placeholder="you@example.com" className={inputCls} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[13px] font-medium">Password<input value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} required type="password" placeholder="8+ characters" className={inputCls} /></label>
          <label className="block text-[13px] font-medium">Confirm<input value={f.pw2} onChange={(e) => setF({ ...f, pw2: e.target.value })} required type="password" placeholder="Repeat it" className={inputCls} /></label>
        </div>
        <button disabled={busy} className="btn-aurora group flex w-full items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Creating account…" : <>Create account <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></>}
        </button>
      </form>
      <p className="mt-5 text-center text-[13px] text-slate-400">Have an account? <Link href={`/login${qs}`} className="font-bold text-white">Log in</Link></p>
    </AuthFrame>
  );
}
