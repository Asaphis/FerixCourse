"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { usePrefs } from "@/components/dashboard/preferences";
import { PageHead, SignOutButton } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { initials, shortDate } from "@/components/ui/primitives";
import { api } from "@/lib/dashboard-api";

/*
  Profile — name and phone are saved through PATCH /auth/me (the only screen
  that can write them; the GET projection does not include them until the first
  save). Theme and motion preferences are local, applied by the shell.
*/

export default function ProfilePage() {
  const { data, reload } = useDashboard();
  const { prefs, update } = usePrefs();
  const profile = data?.profile ?? null;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
  }, [profile?.id, profile?.full_name, profile?.phone]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = fullName.trim();
    if (!name) {
      setError("Name cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await api.patchMe({ full_name: name, phone: phone.trim() });
      await reload();
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHead title="Profile" sub="Your account details and how the app behaves for you." />

      <div className="grid2">
        <section className="card" aria-label="Account">
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
            <span className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>{initials(profile?.full_name ?? profile?.email ?? "?")}</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 800, fontSize: 16 }}>{profile?.full_name ?? "Your name"}</p>
              <p className="hint">{profile?.email}</p>
              <p className="hint">
                <span className="badge">{profile?.role ?? "STUDENT"}</span>{" "}
                {profile?.created_at ? `· joined ${shortDate(profile.created_at)}` : ""}
              </p>
            </div>
          </div>

          <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
            <div>
              <label className="fc-sr-only" htmlFor="pf-name">Full name</label>
              <input
                id="pf-name"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="fc-sr-only" htmlFor="pf-phone">Phone</label>
              <input
                id="pf-phone"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (optional)"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>

            {error && <p style={{ color: "var(--danger, #fca5a5)", fontSize: 13 }} role="alert">{error}</p>}
            {saved && !error && <p style={{ color: "var(--ok, #34d399)", fontSize: 13 }} role="status">Saved.</p>}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn pri" disabled={saving}>
                <Icon name="check" size={15} /> {saving ? "Saving…" : "Save changes"}
              </button>
              <SignOutButton />
            </div>
          </form>
        </section>

        <section className="card" aria-label="Preferences">
          <h2 className="eyebrow-sm" style={{ marginBottom: 12 }}>Preferences</h2>

          <div className="qa">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name={prefs.theme === "dark" ? "moon" : "sun"} size={16} />
              <span style={{ flex: 1 }}>
                <b style={{ fontSize: 13.5 }}>Theme</b>
                <span className="hint" style={{ display: "block" }}>{prefs.theme === "dark" ? "Dark" : "Light"}</span>
              </span>
              <button type="button" className="btn ghost sm" onClick={() => update({ theme: prefs.theme === "dark" ? "light" : "dark" })}>
                Switch to {prefs.theme === "dark" ? "light" : "dark"}
              </button>
            </div>
          </div>

          <div className="qa">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="activity" size={16} />
              <span style={{ flex: 1 }}>
                <b style={{ fontSize: 13.5 }}>Reduce motion</b>
                <span className="hint" style={{ display: "block" }}>Calms the interface animations</span>
              </span>
              <button
                type="button"
                className={prefs.reduceMotion ? "btn sm pri" : "btn ghost sm"}
                onClick={() => update({ reduceMotion: !prefs.reduceMotion })}
                aria-pressed={prefs.reduceMotion}
              >
                {prefs.reduceMotion ? "On" : "Off"}
              </button>
            </div>
          </div>

          <div className="qa" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="shieldCheck" size={16} />
              <span style={{ flex: 1 }}>
                <b style={{ fontSize: 13.5 }}>Account status</b>
                <span className="hint" style={{ display: "block" }}>
                  {profile?.email_verified ? "Email verified" : "Email not verified yet"} ·{" "}
                  {profile?.is_active ? "Active" : "Disabled"}
                </span>
              </span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
