"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthFrame, AuthError, AuthOk, AuthWarn, inputCls } from "@/components/auth";
import { apiForgot } from "@/lib/auth";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    try {
      await apiForgot(email);
      setOk("If that email is registered, a reset link is on its way.");
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
        <button disabled={busy} className="btn pri w-full">
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-5 text-center text-[13px] text-slate-400">Remember it? <Link href="/login" className="font-bold text-white">Log in</Link></p>
    </AuthFrame>
  );
}
