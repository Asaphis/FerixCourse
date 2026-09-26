"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthFrame, AuthError, inputCls } from "@/components/auth";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Recovery link establishes a session; wait for it before accepting input.
    supabase().auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase().auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (pw !== pw2) return setErr("Passwords do not match.");
    if (pw.length < 8) return setErr("Password must be at least 8 characters.");
    setBusy(true);
    try {
      const { error } = await supabase().auth.updateUser({ password: pw });
      if (error) throw error;
      await supabase().auth.signOut();
      router.push("/login?reset=1");
    } catch (e: any) {
      setErr(e?.message ?? "Could not reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Set new password" sub="Choose a fresh password for your account.">
      <AuthError msg={err} />
      {!ready ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3.5 text-sm text-slate-400">
          Verifying your reset link… If you opened this page directly, request a new link from{" "}
          <Link href="/forgot-password" className="font-bold text-white">forgot password</Link>.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3.5">
          <label className="block text-[13px] font-medium">New password
            <input value={pw} onChange={(e) => setPw(e.target.value)} required type="password" placeholder="8+ characters" className={inputCls} />
          </label>
          <label className="block text-[13px] font-medium">Confirm new password
            <input value={pw2} onChange={(e) => setPw2(e.target.value)} required type="password" placeholder="Repeat it" className={inputCls} />
          </label>
          <button disabled={busy} className="btn-aurora w-full rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </AuthFrame>
  );
}
