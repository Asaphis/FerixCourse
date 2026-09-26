"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthFrame } from "@/components/auth";
import { apiBase } from "@/lib/auth";

export default function VerifyEmailPage() {
  const [state, setState] = useState<"loading" | "ok" | "bad">("loading");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") ?? "";
    if (!t) { setState("bad"); return; }
    fetch(`${apiBase}/auth/verify?token=${encodeURIComponent(t)}`)
      .then((r) => setState(r.ok ? "ok" : "bad"))
      .catch(() => setState("bad"));
  }, []);

  return (
    <AuthFrame title="Email verification" sub="Confirming your account.">
      {state === "loading" && <p className="mt-6 text-sm text-slate-400">Verifying…</p>}
      {state === "ok" && (
        <div className="mt-6 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-300" />
          <p className="mt-3 font-display text-lg font-bold">Verified — welcome!</p>
          <Link href="/login?verified=1" className="btn-aurora mt-5 inline-block rounded-2xl px-6 py-3 text-sm font-bold text-white">Log in</Link>
        </div>
      )}
      {state === "bad" && (
        <div className="mt-6 text-center">
          <XCircle size={40} className="mx-auto text-rose-300" />
          <p className="mt-3 text-sm text-slate-400">This link expired or was already used. Register again or request a new link.</p>
          <Link href="/register" className="mt-5 inline-block rounded-2xl border border-white/15 px-6 py-3 text-sm font-bold hover:bg-white/5">Back to register</Link>
        </div>
      )}
    </AuthFrame>
  );
}
