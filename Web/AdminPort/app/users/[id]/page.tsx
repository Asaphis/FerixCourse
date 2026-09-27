"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Icon } from "@/components/icons";
import { Alert, Avatar, Badge, EmptyState, ErrorNote, PageHead, SectionHead, Skeleton, StatusBadge } from "@/components/ui";
import { adminFetch, money, shortDate, shortDateTime } from "@/lib/admin";
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

  The console previously had no learner detail view at all — the list showed
  rows you could not open, so nothing that exists on the learner side (their
  enrollments, payments, bookings, submissions) could be inspected or corrected.
*/

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const detail = useAdmin<UserDetail>(`/admin/users/${id}`);
  const courses = useAdmin<any[]>("/admin/courses");
  const classrooms = useAdmin<any[]>("/admin/classrooms");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
    setNotice("");
    try {
      await adminFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      detail.reload();
      setNotice(ok);
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
    setNotice("");
    try {
      const r = await adminFetch<{ already_enrolled?: boolean }>(`/admin/users/${id}/enrollments`, {
        method: "POST",
        body: JSON.stringify(grant),
      });
      setGrant({ product_type: grant.product_type, product_id: "" });
      detail.reload();
      setNotice(r?.already_enrolled ? "They already had access to that." : "Access granted and the learner notified.");
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
      setNotice("Access revoked.");
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
      <PageHead
        title={p?.full_name || p?.email || "Learner"}
        sub={p ? `${p.email} · joined ${shortDate(p.created_at)}` : "Profile, access and payment history."}
        actions={
          <>
            <Link className="ad-btn ad-btn-ghost" href="/users">
              <Icon name="arrowLeft" size={14} /> All learners
            </Link>
            <button type="button" className="ad-btn ad-btn-ghost" onClick={() => detail.reload()}>
              <Icon name="refresh" size={14} /> Refresh
            </button>
          </>
        }
      />

      {error ? <ErrorNote message={error} onRetry={() => setError("")} /> : null}
      {notice ? (
        <Alert tone="ok" icon="check">
          {notice}
        </Alert>
      ) : null}
      {detail.error ? <ErrorNote message={detail.error} onRetry={detail.reload} /> : null}
      {detail.loading && !detail.data ? <Skeleton height={140} count={3} /> : null}

      {detail.data ? (
        <>
          {/* ---------- identity + moderation ---------- */}
          <div className="ad-grid ad-grid-3">
            <div className="ad-card">
              <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
                <Avatar name={p?.full_name || p?.email} />
                <div style={{ minWidth: 0 }}>
                  <p className="ad-row-title">{p?.full_name || "—"}</p>
                  <p className="ad-row-meta">{p?.email}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <Badge tone={p?.role === "ADMIN" ? "brand" : "neutral"}>{p?.role}</Badge>
                {p?.is_active ? <Badge tone="ok">Active</Badge> : <Badge tone="danger">Disabled</Badge>}
                {p?.email_verified ? <Badge tone="ok">Email verified</Badge> : <Badge tone="warn">Unverified</Badge>}
              </div>
            </div>

            <div className="ad-card">
              <p className="ad-sec-title">Moderation</p>
              <div className="ad-stack" style={{ marginTop: 12, gap: 10 }}>
                <button
                  type="button"
                  className={`ad-btn ${p?.is_active ? "ad-btn-danger" : "ad-btn-primary"} ad-btn-block`}
                  disabled={busy === "is_active"}
                  onClick={() =>
                    patch(
                      { is_active: !p?.is_active },
                      p?.is_active ? "Account disabled and the learner notified." : "Account re-activated."
                    )
                  }
                >
                  <Icon name={p?.is_active ? "lock" : "check"} size={14} />
                  {busy === "is_active" ? "Saving…" : p?.is_active ? "Disable account" : "Re-activate account"}
                </button>
                <div className="ad-field">
                  <label className="ad-label" htmlFor="ad-role">
                    Role
                  </label>
                  <select
                    id="ad-role"
                    className="ad-select"
                    value={p?.role ?? "STUDENT"}
                    disabled={busy === "role"}
                    onChange={(e) => patch({ role: e.target.value }, "Role updated.")}
                  >
                    <option value="STUDENT">Student</option>
                    <option value="INSTRUCTOR">Instructor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <span className="ad-hint">Promoting to admin grants this console. You cannot demote yourself.</span>
                </div>
              </div>
            </div>

            <div className="ad-card">
              <p className="ad-sec-title">At a glance</p>
              <dl className="ad-sm" style={{ display: "grid", gap: 8, marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <dt className="ad-faint">Courses</dt>
                  <dd>{(detail.data.courses ?? []).length}</dd>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <dt className="ad-faint">Classrooms</dt>
                  <dd>{(detail.data.classrooms ?? []).length}</dd>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <dt className="ad-faint">Transactions</dt>
                  <dd>{(detail.data.transactions ?? []).length}</dd>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <dt className="ad-faint">Bookings</dt>
                  <dd>{(detail.data.bookings ?? []).length}</dd>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <dt className="ad-faint">Submissions</dt>
                  <dd>{(detail.data.submissions ?? []).length}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* ---------- access ---------- */}
          <div className="ad-card" style={{ marginTop: 16 }}>
            <SectionHead title="Grant access" />
            <form onSubmit={grantAccess} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "0 1 180px" }}>
                <label className="ad-label" htmlFor="ad-grant-type">
                  Type
                </label>
                <select
                  id="ad-grant-type"
                  className="ad-select"
                  value={grant.product_type}
                  onChange={(e) => setGrant({ product_type: e.target.value, product_id: "" })}
                >
                  <option value="course">Course</option>
                  <option value="classroom">Classroom</option>
                </select>
              </div>
              <div style={{ flex: "1 1 260px" }}>
                <label className="ad-label" htmlFor="ad-grant-product">
                  {grant.product_type === "course" ? "Course" : "Classroom"}
                </label>
                <select
                  id="ad-grant-product"
                  className="ad-select"
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
              <button type="submit" className="ad-btn ad-btn-primary" disabled={busy === "grant" || !grant.product_id}>
                <Icon name="plus" size={14} /> {busy === "grant" ? "Granting…" : "Grant access"}
              </button>
            </form>
          </div>

          <SectionHead title="Access" count={enrollments.length} />
          {enrollments.length === 0 ? (
            <EmptyState
              icon="graduationCap"
              title="No access yet"
              body="Grant access above, or wait for the learner to enroll from the catalog."
            />
          ) : (
            <div className="ad-card ad-card-pad-0">
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <caption className="ad-sr-only">Courses and classrooms this learner can access</caption>
                  <thead>
                    <tr>
                      <th scope="col">Title</th>
                      <th scope="col">Type</th>
                      <th scope="col">Enrolled</th>
                      <th scope="col">
                        <span className="ad-sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e) => (
                      <tr key={e.enrollment_id}>
                        <td className="ad-row-title">{e.title}</td>
                        <td>
                          <Badge tone={e.kind === "Course" ? "info" : "brand"}>{e.kind}</Badge>
                        </td>
                        <td className="ad-muted">{shortDateTime(e.enrolled_at)}</td>
                        <td>
                          <span className="ad-row-actions">
                            <Link
                              className="ad-btn ad-btn-ghost ad-btn-sm"
                              href={e.kind === "Course" ? `/courses/${e.id}` : `/classrooms/${e.id}`}
                            >
                              <Icon name="eye" size={13} /> Manage
                            </Link>
                            <button
                              type="button"
                              className="ad-btn ad-btn-ghost ad-btn-sm"
                              disabled={busy === `rev-${e.enrollment_id}`}
                              onClick={() => revoke(e.enrollment_id)}
                            >
                              <Icon name="x" size={13} /> Revoke
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------- payments ---------- */}
          <SectionHead title="Transactions" count={(detail.data.transactions ?? []).length} />
          {(detail.data.transactions ?? []).length === 0 ? (
            <EmptyState icon="receipt" title="No transactions" body="Payments this learner makes will appear here." />
          ) : (
            <div className="ad-card ad-card-pad-0">
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <caption className="ad-sr-only">This learner's payment history</caption>
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Product</th>
                      <th scope="col" className="num">
                        Amount
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.data.transactions ?? []).map((t) => (
                      <tr key={t.id}>
                        <td className="ad-mono">{t.flutterwave_ref || t.id.slice(0, 8)}</td>
                        <td>{t.product_type}</td>
                        <td className="num">{money(t.amount_kobo, t.currency)}</td>
                        <td>
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="ad-muted">{shortDate(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------- requests & bookings ---------- */}
          <div className="ad-split-even" style={{ marginTop: 16 }}>
            <div>
              <SectionHead title="Class requests" count={(detail.data.requests ?? []).length} />
              {(detail.data.requests ?? []).length === 0 ? (
                <EmptyState icon="clipboard" title="No requests" />
              ) : (
                <div className="ad-card ad-card-pad-0">
                  {(detail.data.requests ?? []).map((r) => (
                    <div className="ad-row" key={r.id}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="ad-row-title">{r.topic}</span>
                        <span className="ad-row-meta">{shortDate(r.created_at)}</span>
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <SectionHead title="Bookings" count={(detail.data.bookings ?? []).length} />
              {(detail.data.bookings ?? []).length === 0 ? (
                <EmptyState icon="calendarCheck" title="No bookings" />
              ) : (
                <div className="ad-card ad-card-pad-0">
                  {(detail.data.bookings ?? []).map((b) => (
                    <div className="ad-row" key={b.id}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="ad-row-title">{b.topic}</span>
                        <span className="ad-row-meta">
                          {b.duration_min} min · {shortDate(b.preferred_date)}
                        </span>
                      </span>
                      <StatusBadge status={b.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </Shell>
  );
}
