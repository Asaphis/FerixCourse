"use client";
import Link from "next/link";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { usePrefs } from "@/components/dashboard/preferences";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { Avatar, LoadingGrid, StatusBadge, shortDateTime } from "@/components/ui/primitives";
import { money } from "@/lib/dashboard-api";

/*
  Profile — real account data from GET /auth/me plus your recent payments from
  GET /api/transactions/mine. Preferences here are genuinely applied: the theme
  and the reduce-motion switch both change the dashboard immediately and persist.
*/

export default function ProfilePage() {
  const { data, loading, failures } = useDashboard();
  const { prefs, update } = usePrefs();
  const profile = data?.profile;
  const tx = (data?.transactions ?? []).slice(0, 5);
  const name = profile?.full_name || profile?.email?.split("@")[0] || "Learner";
  const role = profile?.role === "INSTRUCTOR" ? "Instructor" : profile?.role === "ADMIN" ? "Administrator" : "Learner";

  return (
    <>
      <PageHead title="Profile" sub="Your account details and recent activity." />

      {failures.length > 0 && failures.includes("dashboard") && (
        <div className="fc-alert fc-alert-danger" role="alert">
          <Icon name="alertCircle" size={17} />
          <span>Could not load your profile right now. Refresh the page to try again.</span>
        </div>
      )}

      <div className="fc-band">
        <div className="fc-stack">
          <section className="fc-card" aria-labelledby="pf-details">
            <div className="fc-sec-head">
              <h2 className="fc-sec-title" id="pf-details">
                Account
              </h2>
            </div>
            {loading ? (
              <LoadingGrid height={90} count={1} />
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <Avatar name={name} large />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--fc-font-display)", fontSize: 18, fontWeight: 800 }}>{name}</p>
                    <p style={{ fontSize: 13, color: "var(--fc-muted)", wordBreak: "break-word" }}>{profile?.email}</p>
                  </div>
                </div>
                <dl style={{ margin: 0 }}>
                  <div className="fc-def-row">
                    <dt>Role</dt>
                    <dd>{role}</dd>
                  </div>
                  <div className="fc-def-row">
                    <dt>Email status</dt>
                    <dd>
                      {profile?.email_verified ? (
                        <span className="fc-badge fc-badge-ok">
                          <Icon name="check" size={12} /> Verified
                        </span>
                      ) : (
                        <span className="fc-badge fc-badge-warn">Not verified</span>
                      )}
                    </dd>
                  </div>
                  <div className="fc-def-row">
                    <dt>Member since</dt>
                    <dd>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</dd>
                  </div>
                  <div className="fc-def-row">
                    <dt>Account state</dt>
                    <dd>
                      {profile?.is_active ? (
                        <span className="fc-badge fc-badge-ok">Active</span>
                      ) : (
                        <span className="fc-badge fc-badge-danger">Disabled</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </section>

          <section className="fc-card" aria-labelledby="pf-payments">
            <div className="fc-sec-head">
              <h2 className="fc-sec-title" id="pf-payments">
                Recent payments
              </h2>
              <Link href="/transactions" className="fc-btn-quiet fc-btn">
                All transactions <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            {loading ? (
              <LoadingGrid height={60} count={2} />
            ) : tx.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--fc-muted)" }}>No payments yet.</p>
            ) : (
              <div className="fc-table-wrap">
                <table className="fc-tbl">
                  <caption className="fc-sr-only">Your five most recent payments</caption>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Date</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="num">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tx.map((t) => (
                      <tr key={t.id}>
                        <td style={{ textTransform: "capitalize", fontWeight: 600 }}>{t.product_type}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{shortDateTime(t.created_at)}</td>
                        <td>
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="num" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                          {money(t.amount_kobo, t.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="fc-stack">
          <section className="fc-card" aria-labelledby="pf-prefs">
            <div className="fc-sec-head">
              <h2 className="fc-sec-title" id="pf-prefs">
                Display
              </h2>
            </div>

            <div className="fc-set-row">
              <div className="fc-row-main">
                <p className="fc-row-title">Light theme</p>
                <p className="fc-row-meta">Switch between the dark and light palettes.</p>
              </div>
              <label className="fc-switch">
                <input
                  type="checkbox"
                  aria-label="Use light theme"
                  checked={prefs.theme === "light"}
                  onChange={(e) => update({ theme: e.target.checked ? "light" : "dark" })}
                />
                <span className="fc-switch-track" />
              </label>
            </div>

            <div className="fc-set-row">
              <div className="fc-row-main">
                <p className="fc-row-title">Reduce motion</p>
                <p className="fc-row-meta">Turn off the animated page transitions and pulsing live indicator.</p>
              </div>
              <label className="fc-switch">
                <input
                  type="checkbox"
                  aria-label="Reduce motion"
                  checked={prefs.reduceMotion}
                  onChange={(e) => update({ reduceMotion: e.target.checked })}
                />
                <span className="fc-switch-track" />
              </label>
            </div>

            <p className="fc-hint">Saved on this device and applied straight away.</p>
          </section>

          <section className="fc-card" aria-labelledby="pf-support">
            <div className="fc-sec-head">
              <h2 className="fc-sec-title" id="pf-support">
                Support
              </h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--fc-muted)", marginBottom: 14 }}>
              Need your data exported or your account changed? Message the team and we will handle it.
            </p>
            <Link href="/messages" className="fc-btn fc-btn-primary fc-btn-block fc-btn-sm">
              <Icon name="messageSquare" size={15} /> Open messages
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
