"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthFrame, AuthError, inputCls } from "@/components/auth";
import { apiReset } from "@/lib/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (pw !== pw2) return setErr("Passwords do not match.");
    if (pw.length < 8) return setErr("Password must be at least 8 characters.");
    setBusy(true);
    try {
      await apiReset(token, pw);
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
      {!token ? (
        <p className="alert info mt-6">
          <span>
            This page needs a reset link. Request a new one from{" "}
            <Link href="/forgot-password" style={{ fontWeight: 700, color: "var(--brand-text)" }}>forgot password</Link>.
          </span>
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3.5">
          <label className="block text-[13px] font-medium">New password
            <input value={pw} onChange={(e) => setPw(e.target.value)} required type="password" placeholder="8+ characters" className={inputCls} />
          </label>
          <label className="block text-[13px] font-medium">Confirm new password
            <input value={pw2} onChange={(e) => setPw2(e.target.value)} required type="password" placeholder="Repeat it" className={inputCls} />
          </label>
          <button disabled={busy} className="btn pri w-full">
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </AuthFrame>
  );
}
