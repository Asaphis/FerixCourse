"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge, Drawer, Emp, Err, Ic, Kv, Ph, SecHead, SkList } from "@/components/reb-ui";
import { adminFetch, shortDate } from "@/lib/admin";

/*
  Learners - list on the rebuild design. Each card opens a panel with the
  learner's record: access, role, enrolments, payments and submissions.
  GET /admin/users?search=
  GET /admin/users/:id  (adds courses, classrooms, transactions, bookings, requests, submissions)
  PATCH /admin/users/:id  is_active | role | full_name
*/

type Person = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
};

type Detail = Person & {
  email_verified?: boolean;
  courses?: Array<{ id: string; title: string; slug: string; enrolled_at: string }>;
  classrooms?: Array<{ id: string; title: string; slug: string; schedule_text: string | null; enrolled_at: string }>;
  transactions?: Array<{ id: string; amount_kobo: number; currency: string; status: string; created_at: string }>;
  bookings?: Array<{ id: string; created_at: string }>;
  requests?: Array<{ id: string; created_at: string }>;
  submissions?: Array<{ id: string; created_at: string }>;
};

export default function UsersPage() {
  const [rows, setRows] = useState<Person[]>([]);
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailErr, setDetailErr] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  async function load(term: string) {
    setLoading(true);
    setErr("");
    try {
      setRows(await adminFetch(`/admin/users?search=${encodeURIComponent(term)}`));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(applied);
  }, [applied]);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    setDetailErr("");
    adminFetch<Detail>(`/admin/users/${openId}`)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch((e: unknown) => {
        if (alive) setDetailErr(e instanceof Error ? e.message : "Could not load this learner.");
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [openId, busy]);

  async function patch(payload: Record<string, unknown>, ok: string) {
    if (!openId) return;
    setBusy("save");
    setErr("");
    try {
      await adminFetch(`/admin/users/${openId}`, { method: "PATCH", body: JSON.stringify(payload) });
      setMsg(ok);
      await load(applied);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not save that change.");
    } finally {
      setBusy("");
    }
  }

  const initials = (p: Person) => (p.full_name || p.email).slice(0, 2).toUpperCase();

  return (
    <Shell>
      <Ph
        title="Learners"
        sub="Search accounts, open a card, and manage access, roles and payments."
        actions={
          <button type="button" className="reb-btn ghost sm" onClick={() => void load(applied)}>
            <Ic name="refresh" size={14} /> Refresh
          </button>
        }
      />

      {err ? <Err msg={err} onRetry={() => void load(applied)} /> : null}
      {msg ? <div className="alert" role="status" style={{ marginBottom: 14 }}><Ic name="check" size={16} /> {msg}</div> : null}

      <section className="reb-card" style={{ marginBottom: 18 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(q);
          }}
          style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="field" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
            <label className="kind" htmlFor="u-search">Search</label>
            <input
              id="u-search"
              className="reb-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name or email"
            />
          </div>
          <button type="submit" className="reb-btn pri sm">
            <Ic name="search" size={14} /> Search
          </button>
          {applied ? (
            <button
              type="button"
              className="reb-btn ghost sm"
              onClick={() => {
                setQ("");
                setApplied("");
              }}
            >
              <Ic name="x" size={14} /> Clear
            </button>
          ) : null}
        </form>
      </section>

      <div className="statline" style={{ marginBottom: 18 }}>
        <div className="statchip">
          <b>{rows.length}</b>
          <span><Ic name="users" size={12} /> accounts shown</span>
        </div>
        <div className="statchip">
          <b>{rows.filter((r) => r.is_active).length}</b>
          <span><Ic name="check" size={12} /> active</span>
        </div>
        <div className="statchip">
          <b>{rows.filter((r) => !r.is_active).length}</b>
          <span><Ic name="lock" size={12} /> restricted</span>
        </div>
        <div className="statchip">
          <b>{rows.filter((r) => r.role !== "STUDENT").length}</b>
          <span><Ic name="shield" size={12} /> staff</span>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <SkList rows={4} />
      ) : rows.length === 0 ? (
        <Emp
          icon="users"
          title={applied ? `No accounts match "${applied}"` : "No learners yet"}
          note={applied ? "Try a different name or email." : "Accounts appear here as soon as learners register."}
        />
      ) : (
        <div className="kgrid">
          {rows.map((p) => (
            <button
              key={p.id}
              type="button"
              className="tile"
              onClick={() => setOpenId(p.id)}
              style={{ textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span className="avatar" style={{ width: 34, height: 34, fontSize: 12, flex: "none" }}>{initials(p)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.full_name || "Unnamed learner"}
                  </b>
                  <span className="hint" style={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{p.email}</span>
                </span>
                <Badge tone={p.is_active ? "ok" : "danger"}>{p.is_active ? "Active" : "Restricted"}</Badge>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Badge tone={p.role === "ADMIN" ? "brand" : p.role === "INSTRUCTOR" ? "info" : ""}>{p.role}</Badge>
                <span className="hint" style={{ fontSize: 11.5, display: "flex", gap: 5, alignItems: "center" }}>
                  <Ic name="clock" size={12} /> joined {shortDate(p.created_at)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Drawer open={Boolean(openId)} onClose={() => setOpenId(null)}>
        <div className="drawer-head">
          <span className="avatar" style={{ width: 40, height: 40, fontSize: 13 }}>
            {detail ? (detail.full_name || detail.email).slice(0, 2).toUpperCase() : "?"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>{detail?.full_name || (detailLoading ? "Loading..." : "Learner")}</h3>
            <span className="hint">{detail ? detail.email : ""}</span>
          </div>
          <button type="button" className="reb-btn ghost sm" onClick={() => setOpenId(null)} aria-label="Close">
            <Ic name="x" size={14} />
          </button>
        </div>
        <div className="drawer-body">
          {detailErr ? <Err msg={detailErr} /> : null}
          {detailLoading && !detail ? (
            <SkList rows={3} />
          ) : detail ? (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <Badge tone={detail.is_active ? "ok" : "danger"}>{detail.is_active ? "Active" : "Restricted"}</Badge>
                <Badge tone={detail.role === "ADMIN" ? "brand" : detail.role === "INSTRUCTOR" ? "info" : ""}>{detail.role}</Badge>
                <Badge tone={detail.email_verified ? "ok" : "warn"}>{detail.email_verified ? "Email verified" : "Email unverified"}</Badge>
              </div>

              <Kv k="Joined">{shortDate(detail.created_at)}</Kv>
              <Kv k="Courses">{(detail.courses ?? []).length}</Kv>
              <Kv k="Classrooms">{(detail.classrooms ?? []).length}</Kv>
              <Kv k="Payments">{(detail.transactions ?? []).length}</Kv>
              <Kv k="Bookings">{(detail.bookings ?? []).length}</Kv>
              <Kv k="Requests">{(detail.requests ?? []).length}</Kv>
              <Kv k="Submissions">{(detail.submissions ?? []).length}</Kv>

              {(detail.courses ?? []).length > 0 ? (
                <>
                  <div className="sec-head" style={{ marginTop: 18 }}>
                    <Ic name="bookOpen" size={14} />
                    <h3 style={{ fontSize: 13.5 }}>Enrolled courses</h3>
                  </div>
                  {(detail.courses ?? []).map((c) => (
                    <div className="trow" key={c.id}>
                      <span className="tico" style={{ width: 30, height: 30 }}><Ic name="bookOpen" size={13} /></span>
                      <span className="tbody">
                        <b>{c.title}</b>
                        <span>since {shortDate(c.enrolled_at)}</span>
                      </span>
                    </div>
                  ))}
                </>
              ) : null}

              {(detail.classrooms ?? []).length > 0 ? (
                <>
                  <div className="sec-head" style={{ marginTop: 18 }}>
                    <Ic name="grid" size={14} />
                    <h3 style={{ fontSize: 13.5 }}>Classrooms</h3>
                  </div>
                  {(detail.classrooms ?? []).map((c) => (
                    <div className="trow" key={c.id}>
                      <span className="tico" style={{ width: 30, height: 30 }}><Ic name="grid" size={13} /></span>
                      <span className="tbody">
                        <b>{c.title}</b>
                        <span>{c.schedule_text || `since ${shortDate(c.enrolled_at)}`}</span>
                      </span>
                    </div>
                  ))}
                </>
              ) : null}

              <div className="sec-head" style={{ marginTop: 18 }}>
                <Ic name="settings" size={14} />
                <h3 style={{ fontSize: 13.5 }}>Access and role</h3>
              </div>
              <div className="field">
                <label className="kind" htmlFor="u-role">Role</label>
                <select
                  id="u-role"
                  className="reb-input"
                  value={detail.role}
                  disabled={busy === "save"}
                  onChange={(e) => void patch({ role: e.target.value }, "Role updated.")}
                >
                  <option value="STUDENT">STUDENT</option>
                  <option value="INSTRUCTOR">INSTRUCTOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </>
          ) : null}
        </div>
        <div className="drawer-foot">
          {detail ? (
            <button
              type="button"
              className={`reb-btn ${detail.is_active ? "danger" : "pri"}`}
              disabled={busy === "save"}
              onClick={() => void patch({ is_active: !detail.is_active }, detail.is_active ? "Account restricted." : "Account restored.")}
            >
              <Ic name={detail.is_active ? "lock" : "check"} size={14} />
              {busy === "save" ? "Saving..." : detail.is_active ? "Restrict account" : "Restore account"}
            </button>
          ) : null}
          {detail ? (
            <Link className="reb-btn ghost sm" href={`/users/${detail.id}`}>
              <Ic name="external" size={13} /> Full page
            </Link>
          ) : null}
        </div>
      </Drawer>
    </Shell>
  );
}
