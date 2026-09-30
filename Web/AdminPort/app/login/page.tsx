"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/admin";
import { Ic } from "@/components/reb-ui";

/*
  Admin sign-in — rebuilt on the same tokens as the console (reb-card, reb-input,
  reb-btn). The screen mounts inside a `.reb` scope because every rebuild class
  is scoped to it, exactly like the shell does.
*/
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
      await adminLogin(email, pw);
      router.push("/");
    } catch (e: any) {
      setErr(e?.message ?? "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="reb"
      data-theme="dark"
      style={{
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflow: "auto",
        background:
          "radial-gradient(900px 420px at 12% -8%, rgba(249,115,22,.10), transparent 60%), radial-gradient(760px 420px at 92% 4%, rgba(225,29,72,.08), transparent 55%), var(--bg)",
      }}
    >
      <form
        onSubmit={submit}
        className="reb-card"
        style={{ width: "100%", maxWidth: 400, padding: 30 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #f97316, #e11d48)",
              color: "#fff",
              fontWeight: 900,
              fontFamily: "var(--font-d, Archivo, sans-serif)",
              fontSize: 13,
            }}
            aria-hidden="true"
          >
            FC
          </span>
          <span style={{ fontWeight: 800, fontFamily: "var(--font-d, Archivo, sans-serif)" }}>
            Ferix<span style={{ color: "var(--brand-text)" }}>Course</span>
            <small
              className="hint"
              style={{ display: "block", fontWeight: 600, letterSpacing: "0.06em" }}
            >
              OPERATIONS CONSOLE
            </small>
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-d, Archivo, sans-serif)",
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          Admin sign in
        </h1>
        <p className="hint" style={{ marginTop: 4, marginBottom: 18 }}>
          Restricted area. Admin accounts only.
        </p>

        {err ? (
          <div className="alert danger" role="alert" style={{ marginBottom: 14 }}>
            <Ic name="alertCircle" size={17} />
            <span>{err}</span>
          </div>
        ) : null}

        <div className="field" style={{ marginBottom: 12 }}>
          <label className="kind" htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            className="reb-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            autoComplete="email"
            placeholder="admin@example.com"
          />
        </div>
        <div className="field" style={{ marginBottom: 18 }}>
          <label className="kind" htmlFor="admin-pw">
            Password
          </label>
          <input
            id="admin-pw"
            className="reb-input"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
          />
        </div>

        <button type="submit" className="reb-btn pri block" disabled={busy}>
          {busy ? (
            <>
              <span className="spin" aria-hidden="true" /> Signing in…
            </>
          ) : (
            <>
              <Ic name="lock" size={15} /> Sign in
            </>
          )}
        </button>

        <p className="hint" style={{ marginTop: 16, textAlign: "center" }}>
          FerixCourse staff access — contact the owner if you need an account.
        </p>
      </form>
    </div>
  );
}
