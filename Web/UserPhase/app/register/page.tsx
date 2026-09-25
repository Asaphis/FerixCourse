"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (pw !== pw2) return setErr("Passwords do not match.");
    if (pw.length < 8) return setErr("Password must be at least 8 characters.");
    setBusy(true);
    try {
      const sb = supabase();
      const { error } = await sb.auth.signUp({
        email,
        password: pw,
        options: { data: { full_name: name } },
      });
      if (error) throw error;
      router.push("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Registration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[380px] rounded-full blur-3xl opacity-50 bg-gradient-to-r from-brand-600 via-fuchsia-500 to-neon-cyan animate-aurora" />
      <form onSubmit={submit} className="relative glass rounded-3xl p-8 w-full max-w-md shadow-card">
        <Link href="/" className="font-display font-extrabold text-lg">Ferix<span className="text-gradient">Course</span></Link>
        <h1 className="font-display text-2xl font-bold mt-4">Create account</h1>
        <p className="text-sm text-slate-400 mt-1">Start learning with live classes and courses.</p>
        {!isSupabaseConfigured() && (
          <p className="mt-4 text-xs px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200">
            Auth keys not configured yet — set NEXT_PUBLIC_SUPABASE_URL / ANON_KEY in .env.local.
          </p>
        )}
        {err && <p className="mt-4 text-sm px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-200">{err}</p>}
        <label className="block mt-5 text-sm">Full name
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="mt-1 w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-brand-400" placeholder="Ada Lovelace" />
        </label>
        <label className="block mt-3 text-sm">Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email"
            className="mt-1 w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-brand-400" placeholder="you@example.com" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block mt-3 text-sm">Password
            <input value={pw} onChange={(e) => setPw(e.target.value)} required type="password"
              className="mt-1 w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-brand-400" placeholder="••••••••" />
          </label>
          <label className="block mt-3 text-sm">Confirm
            <input value={pw2} onChange={(e) => setPw2(e.target.value)} required type="password"
              className="mt-1 w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-brand-400" placeholder="••••••••" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full py-3.5 rounded-2xl font-semibold bg-gradient-to-r from-brand-600 via-brand-500 to-neon-cyan shadow-glow disabled:opacity-50">
          {busy ? "Creating…" : "Create account"}
        </button>
        <p className="mt-4 text-sm text-slate-400 text-center">Have an account? <Link href="/login" className="text-white font-semibold">Log in</Link></p>
      </form>
    </main>
  );
}
