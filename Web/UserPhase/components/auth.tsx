"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap, ShieldCheck, Video, Infinity as InfinityIcon, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { apiConfigured } from "@/lib/auth";

/*
  Auth stack frame — rebuilt on the design tokens used everywhere else
  (`.reb` scope, `--surface` cards, `.btn`/`.input`/`.alert` primitives, Archivo
  display type, ember gradients). The wrapper overrides the shell's fixed
  `.reb` positioning inline so a plain scrollable auth page falls out of it.
*/

export const inputCls = "input mt-1.5";

export function AuthFrame({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  const router = useRouter();
  const back = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };
  return (
    <div
      className="reb"
      data-theme="dark"
      style={{
        position: "relative",
        inset: "auto",
        height: "auto",
        minHeight: "100vh",
        overflow: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "36px 16px",
        background:
          "radial-gradient(900px 420px at 12% -8%, rgba(249,115,22,.10), transparent 60%), radial-gradient(760px 420px at 92% 4%, rgba(225,29,72,.08), transparent 55%), var(--bg)",
      }}
    >
      <div
        className="w-full max-w-4xl md:grid md:grid-cols-2"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r5)",
          overflow: "hidden",
          boxShadow: "var(--shadow)",
        }}
      >
        {/* value panel — wide screens only */}
        <div
          className="hidden md:flex"
          style={{
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 34,
            background: "var(--surface2)",
            borderRight: "1px solid var(--border)",
          }}
        >
          <p
            className="flex items-center gap-2.5"
            style={{ fontWeight: 800, fontFamily: "var(--font-d, Archivo, sans-serif)", fontSize: 17, color: "var(--text)" }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #f97316, #e11d48)",
                color: "#fff",
              }}
              aria-hidden="true"
            >
              <GraduationCap size={17} />
            </span>
            Ferix<span style={{ color: "var(--brand-text)" }}>Course</span>
          </p>
          <div>
            <p
              style={{
                fontFamily: "var(--font-d, Archivo, sans-serif)",
                fontSize: 25,
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                color: "var(--text)",
              }}
            >
              One account.
              <br />
              Every classroom.
            </p>
            <ul style={{ marginTop: 22, display: "grid", gap: 12, fontSize: 13.5, color: "var(--muted)", listStyle: "none", padding: 0 }}>
              {[
                [Video, "Join live cohorts with real instructors"],
                [InfinityIcon, "Keep every session recording"],
                [ShieldCheck, "Verified, secure payments"],
              ].map(([Icon, t]: any) => (
                <li key={t} className="flex items-center gap-2.5">
                  <Icon size={15} style={{ color: "var(--brand-text)", flexShrink: 0 }} /> {t}
                </li>
              ))}
            </ul>
          </div>
          <p style={{ fontSize: 12, color: "var(--faint)" }}>Learn technology. Ship real software.</p>
        </div>

        {/* form panel */}
        <div className="p-6 sm:p-9">
          <button type="button" onClick={back} className="btn ghost sm" style={{ marginBottom: 18 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1
            style={{
              fontFamily: "var(--font-d, Archivo, sans-serif)",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            {title}
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, color: "var(--muted)" }}>{sub}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthError({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <p className="alert danger" role="alert" style={{ marginTop: 16, marginBottom: 0 }}>
      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{msg}</span>
    </p>
  );
}

export function AuthOk({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <p className="alert ok" role="status" style={{ marginTop: 16, marginBottom: 0 }}>
      <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{msg}</span>
    </p>
  );
}

export function safeNext(fallback = "/dashboard"): string {
  if (typeof window === "undefined") return fallback;
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}

export function AuthWarn() {
  if (apiConfigured()) return null;
  return (
    <p className="alert info" style={{ marginTop: 16, marginBottom: 0, fontSize: 12 }}>
      <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>API URL is not configured. Add NEXT_PUBLIC_API_URL to .env.local.</span>
    </p>
  );
}
