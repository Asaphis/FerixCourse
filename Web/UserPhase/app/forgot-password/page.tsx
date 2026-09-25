"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthFrame, AuthError, AuthOk, AuthWarn, inputCls } from "@/components/auth";
import { supabase } from "@/lib/supabase";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    try {
      const { error } = await supabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setOk("Reset link sent. Check your inbox.");
    } catch (e: any) {
      setErr(e?.message ?? "Could not send reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Reset password" sub="We will email you a reset link.">
      <AuthWarn />
      <AuthError msg={err} />
      <AuthOk msg={ok} />
      <form onSubmit={submit} className="mt-6 space-y-3.5">
        <label className="block text-[13px] font-medium">Email<input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="you@example.com" className={inputCls} /></label>
        <button disabled={busy} className="btn-aurora w-full rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-5 text-center text-[13px] text-slate-400">Remember it? <Link href="/login" className="font-bold text-white">Log in</Link></p>
    </AuthFrame>
  );
}
