"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/admin";

export default function AdminLogin() {
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
      router.push("/");
    } catch (e: any) {
      setErr(e?.message ?? "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-ink-950">
      <form onSubmit={submit} className="card w-full max-w-md">
        <p className="font-display font-extrabold text-lg">Ferix<span className="text-brand-400">Admin</span></p>
        <h1 className="font-display text-xl font-bold mt-3">Admin sign in</h1>
        <p className="text-xs text-slate-400 mt-1">Requires a Supabase user whose profile role is ADMIN.</p>
        {err && <p className="mt-4 text-sm px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-200">{err}</p>}
        <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="admin@example.com" className="input mt-5" />
        <input value={pw} onChange={(e) => setPw(e.target.value)} required type="password" placeholder="Password" className="input mt-3" />
        <button disabled={busy} className="btn w-full mt-5">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
