"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge, Emp, Err, Ic, Ph, SecHead, Sk, ToastHost, toast } from "@/components/reb-ui";
import { adminFetch, initials, money, shortDate, shortDateTime } from "@/lib/admin";
import { useAdmin } from "@/lib/use-admin";
import type { UserDetail } from "@/lib/admin-types";

/*
  One learner, in full.

  Endpoints:
    GET    /admin/users/:id                   profile + courses + classrooms + transactions + bookings + requests + submissions
    PATCH  /admin/users/:id                   is_active | role | full_name
    POST   /admin/users/:id/enrollments       grant access to a course or classroom
    DELETE /admin/users/:id/enrollments/:eid  revoke it
    GET    /admin/courses, /admin/classrooms  the pickable products
*/

function tone(status: string): "" | "ok" | "warn" | "danger" | "info" {
  if (status === "success" || status === "paid" || status === "active" || status === "solved") return "ok";
  if (status === "pending" || status === "processing" || status === "open") return "info";
  if (status === "failed" || status === "disabled" || status === "cancelled") return "danger";
  return "";
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const detail = useAdmin<UserDetail>(`/admin/users/${id}`);
  const courses = useAdmin<any[]>("/admin/courses");
  const classrooms = useAdmin<any[]>("/admin/classrooms");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [grant, setGrant] = useState({ product_type: "course", product_id: "" });

  const p = detail.data?.profile;

  const enrollments = useMemo(() => {
    const c = (detail.data?.courses ?? []).map((x) => ({
      kind: "Course" as const,
      enrollment_id: x.enrollment_id,
      id: x.id,
      title: x.title,
      enrolled_at: x.enrolled_at,
      meta: "",
    }));
    const r = (detail.data?.classrooms ?? []).map((x) => ({
      kind: "Classroom" as const,
      enrollment_id: x.enrollment_id,
      id: x.id,
      title: x.title,
      enrolled_at: x.enrolled_at,
      meta: x.schedule_text || "",
    }));
    return [...c, ...r];
  }, [detail.data]);

  const patch = async (body: Record<string, unknown>, ok: string) => {
    setBusy(Object.keys(body)[0]);
    setError("");
    try {
      await adminFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      detail.reload();
      toast(ok);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update this learner.");
    } finally {
      setBusy("");
    }
  };

  const grantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grant.product_id) return;
    setBusy("grant");
    setError("");
    try {
      const r = await adminFetch<{ already_enrolled?: boolean }>(`/admin/users/${id}/enrollments`, {
        method: "POST",
        body: JSON.stringify(grant),
      });
      setGrant({ product_type: grant.product_type, product_id: "" });
      detail.reload();
      toast(r?.already_enrolled ? "They already had access to that" : "Access granted and the learner notified");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not grant access.");
    } finally {
      setBusy("");
    }
  };

  const revoke = async (enrollmentId: string) => {
    setBusy(`rev-${enrollmentId}`);
    setError("");
    try {
      await adminFetch(`/admin/users/${id}/enrollments/${enrollmentId}`, { method: "DELETE" });
      detail.reload();
      toast("Access revoked");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not revoke access.");
    } finally {
      setBusy("");
    }
  };

  const products =
    grant.product_type === "course"
      ? (courses.data ?? []).map((c: any) => ({ id: c.id, title: c.title }))
      : (classrooms.data ?? []).map((c: any) => ({ id: c.id, title: c.title }));

  return (
    <Shell>
      <Ph
        title={p?.full_name || p?.email || "Learner"}
        sub={p ? `${p.email} · joined ${shortDate(p.created_at)}` : "Profile, access and payment history."}
        actions={
          <>
            <Link className="reb-btn ghost sm" href="/users">
              <Ic name="arrowLeft" size={14} /> All learners
            </Link>
            <button type="button" className="reb-btn ghost sm" onClick={() => detail.reload()}>
              <Ic name="refresh" size={14} /> Refresh
            </button>
          </>
        }
      />

      {error ? <Err msg={error} onRetry={() => setError("")} /> : null}
      {detail.error ? <Err msg={detail.error} onRetry={detail.reload} /> : null}
      {detail.loading && !detail.data ? <Sk h={140} mb={10} /> : null}

      {detail.data ? (
        <>
          {/* ---------- identity + moderation + glance ---------- */}
          <div className="kgrid" style={{ marginBottom: 16 }}>
            <div className="reb-card">
              <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
                <span className="avatar" style={{ width: 46, height: 46, fontSize: 15 }}>
                  {initials(p?.full_name || p?.email)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 800 }}>{p?.full_name || "—"}</p>
                  <p className="hint">{p?.email}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <Badge tone={p?.role === "ADMIN" ? "brand" : ""}>{p?.role}</Badge>
                {p?.is_active ? <Badge tone="ok">Active</Badge> : <Badge tone="danger">Disabled</Badge>}
                {p?.email_verified ? <Badge tone="ok">Email verified</Badge> : <Badge tone="warn">Unverified</Badge>}
              </div>
            </div>

            <div className="reb-card">
              <SecHead icon="shield" title="Moderation" />
              <button
                type="button"
                className={`reb-btn block ${p?.is_active ? "danger" : "pri"}`}
                disabled={busy === "is_active"}
                onClick={() =>
                  patch(
                    { is_active: !p?.is_active },
                    p?.is_active ? "Account disabled and the learner notified" : "Account re-activated"
                  )
                }
              >
                <Ic name={p?.is_active ? "lock" : "check"} size={14} />
                {busy === "is_active" ? "Saving…" : p?.is_active ? "Disable account" : "Re-activate account"}
              </button>
              <div className="field" style={{ marginTop: 12 }}>
                <label className="kind" htmlFor="ud-role">
                  Role
                </label>
                <select
                  id="ud-role"
                  className="select"
                  value={p?.role ?? "STUDENT"}
                  disabled={busy === "role"}
                  onChange={(e) => patch({ role: e.target.value }, "Role updated")}
                >
                  <option value="STUDENT">Student</option>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <span className="hint">Promoting to admin grants this console. You cannot demote yourself.</span>
              </div>
            </div>

            <div className="reb-card">
              <SecHead icon="activity" title="At a glance" />
              <div className="kv">
                <b>Courses</b>
                <span>{(detail.data.courses ?? []).length}</span>
              </div>
              <div className="kv">
                <b>Classrooms</b>
                <span>{(detail.data.classrooms ?? []).length}</span>
              </div>
              <div className="kv">
                <b>Transactions</b>
                <span>{(detail.data.transactions ?? []).length}</span>
              </div>
              <div className="kv">
                <b>Bookings</b>
                <span>{(detail.data.bookings ?? []).length}</span>
              </div>
              <div className="kv">
                <b>Submissions</b>
                <span>{(detail.data.submissions ?? []).length}</span>
              </div>
            </div>
          </div>

          {/* ---------- access ---------- */}
          <section className="reb-card" style={{ marginBottom: 16 }}>
            <SecHead icon="plus" title="Grant access" />
            <form onSubmit={grantAccess} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "0 1 180px" }}>
                <label className="kind" htmlFor="ud-grant-type">
                  Type
                </label>
                <select
                  id="ud-grant-type"
                  className="select"
                  value={grant.product_type}
                  onChange={(e) => setGrant({ product_type: e.target.value, product_id: "" })}
                >
                  <option value="course">Course</option>
                  <option value="classroom">Classroom</option>
                </select>
              </div>
              <div style={{ flex: "1 1 260px" }}>
                <label className="kind" htmlFor="ud-grant-product">
                  {grant.product_type === "course" ? "Course" : "Classroom"}
                </label>
                <select
                  id="ud-grant-product"
                  className="select"
                  value={grant.product_id}
                  onChange={(e) => setGrant({ ...grant, product_id: e.target.value })}
                >
                  <option value="">Select…</option>
                  {products.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="reb-btn pri" disabled={busy === "grant" || !grant.product_id}>
                <Ic name="plus" size={14} /> {busy === "grant" ? "Granting…" : "Grant access"}
              </button>
            </form>
          </section>

          <section className="reb-card" style={{ marginBottom: 16 }}>
            <SecHead icon="graduationCap" title={`Access · ${enrollments.length}`} />
            {enrollments.length === 0 ? (
              <Emp
                icon="graduationCap"
                title="No access yet"
                note="Grant access above, or wait for the learner to enroll from the catalog."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <caption style={{ display: "none" }}>Courses and classrooms this learner can access</caption>
                  <thead>
                    <tr>
                      <th scope="col">Title</th>
                      <th scope="col">Type</th>
                      <th scope="col">Enrolled</th>
                      <th scope="col">
                        <span>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e) => (
                      <tr key={e.enrollment_id}>
                        <td>
                          <b>{e.title}</b>
                        </td>
                        <td>
                          <Badge tone={e.kind === "Course" ? "info" : "brand"}>{e.kind}</Badge>
                        </td>
                        <td className="hint">{shortDateTime(e.enrolled_at)}</td>
                        <td>
                          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <Link
                              className="reb-btn ghost sm"
                              href={e.kind === "Course" ? `/courses/${e.id}` : `/classrooms/${e.id}`}
                            >
                              <Ic name="eye" size={13} /> Manage
                            </Link>
                            <button
                              type="button"
                              className="reb-btn ghost sm"
                              disabled={busy === `rev-${e.enrollment_id}`}
                              onClick={() => revoke(e.enrollment_id)}
                            >
                              <Ic name="x" size={13} /> Revoke
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ---------- payments ---------- */}
          <section className="reb-card" style={{ marginBottom: 16 }}>
            <SecHead icon="receipt" title={`Transactions · ${(detail.data.transactions ?? []).length}`} />
            {(detail.data.transactions ?? []).length === 0 ? (
              <Emp icon="receipt" title="No transactions" note="Payments this learner makes will appear here." />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <caption style={{ display: "none" }}>This learner's payment history</caption>
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Product</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Status</th>
                      <th scope="col">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.data.transactions ?? []).map((t) => (
                      <tr key={t.id}>
                        <td className="hint">{t.flutterwave_ref || t.id.slice(0, 8)}</td>
                        <td>{t.product_type}</td>
                        <td>
                          <b>{money(t.amount_kobo, t.currency)}</b>
                        </td>
                        <td>
                          <Badge tone={tone(t.status)}>{t.status}</Badge>
                        </td>
                        <td className="hint">{shortDate(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ---------- requests & bookings ---------- */}
          <div className="grid2">
            <section className="reb-card">
              <SecHead icon="clipboard" title={`Class requests · ${(detail.data.requests ?? []).length}`} />
              {(detail.data.requests ?? []).length === 0 ? (
                <Emp icon="clipboard" title="No requests" note="Training requests this learner sent will appear here." />
              ) : (
                <div>
                  {(detail.data.requests ?? []).map((r) => (
                    <div key={r.id} className="qa" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: 13 }}>{r.topic}</b>
                        <span className="hint" style={{ display: "block" }}>
                          {shortDate(r.created_at)}
                        </span>
                      </span>
                      <Badge tone={tone(r.status)}>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="reb-card">
              <SecHead icon="calendarCheck" title={`Bookings · ${(detail.data.bookings ?? []).length}`} />
              {(detail.data.bookings ?? []).length === 0 ? (
                <Emp icon="calendarCheck" title="No bookings" note="1-on-1 sessions this learner requested will appear here." />
              ) : (
                <div>
                  {(detail.data.bookings ?? []).map((b) => (
                    <div key={b.id} className="qa" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: 13 }}>{b.topic}</b>
                        <span className="hint" style={{ display: "block" }}>
                          {b.duration_min} min · {shortDate(b.preferred_date)}
                        </span>
                      </span>
                      <Badge tone={tone(b.status)}>{b.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
      <ToastHost />
    </Shell>
  );
}
