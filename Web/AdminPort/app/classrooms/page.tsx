"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge, Drawer, Emp, Err, Ic, Kv, Ph, SecHead, SkList } from "@/components/reb-ui";
import { adminFetch, shortDate } from "@/lib/admin";

/*
  Classrooms - list on the rebuild design. Each card opens a panel with the
  classroom's full record: schedule, seats, price, members, sessions, materials.
  GET /admin/classrooms
  GET /admin/classrooms/:id  (adds members, sessions, materials, announcements, assignments)
  PATCH /admin/classrooms/:id  is_published
*/

const empty = { title: "", slug: "", level: "Beginner", price_kobo: 0, capacity: 30, schedule_text: "" };

type Room = {
  id: string;
  title: string;
  slug: string;
  level: string | null;
  price_kobo: number;
  currency: string;
  capacity: number | null;
  schedule_text: string | null;
  starts_at: string | null;
  is_published: boolean;
  enrolled: number;
  description?: string | null;
};

type Detail = Room & {
  members?: Array<{ id: string; full_name: string | null; email: string; role: string; is_active: boolean; enrolled_at: string }>;
  sessions?: Array<{ id: string; title: string; starts_at: string | null; status: string | null }>;
  materials?: Array<{ id: string; title: string }>;
  announcements?: Array<{ id: string; title?: string; body?: string }>;
  assignments?: Array<{ id: string; title: string }>;
};

export default function ClassroomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailErr, setDetailErr] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      setRooms(await adminFetch("/admin/classrooms"));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not load classrooms.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    setDetailErr("");
    adminFetch<Detail>(`/admin/classrooms/${openId}`)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch((e: unknown) => {
        if (alive) setDetailErr(e instanceof Error ? e.message : "Could not load this classroom.");
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [openId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await adminFetch("/admin/classrooms", { method: "POST", body: JSON.stringify(form) });
      setForm(empty);
      setMsg("Classroom created.");
      void load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create that classroom.");
    }
  }

  async function toggle(room: Room) {
    setBusy(room.id);
    setErr("");
    try {
      await adminFetch(`/admin/classrooms/${room.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_published: !room.is_published }),
      });
      setMsg(room.is_published ? "Unpublished." : "Published.");
      await load();
      if (openId === room.id) setDetail((d) => (d ? { ...d, is_published: !room.is_published } : d));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not change the published state.");
    } finally {
      setBusy("");
    }
  }

  const money = (r: Room) => `${(r.price_kobo / 100).toLocaleString()} ${r.currency}`;
  const seats = (r: Room) => `${r.enrolled ?? 0}/${r.capacity ?? "-"}`;

  return (
    <Shell>
      <Ph
        title="Classrooms"
        sub="Live cohorts. Open a card for its timetable, members and materials."
        actions={
          <button type="button" className="reb-btn ghost sm" onClick={() => void load()}>
            <Ic name="refresh" size={14} /> Refresh
          </button>
        }
      />

      {err ? <Err msg={err} onRetry={() => void load()} /> : null}
      {msg ? <div className="alert" role="status" style={{ marginBottom: 14 }}><Ic name="check" size={16} /> {msg}</div> : null}

      <div className="statline" style={{ marginBottom: 18 }}>
        <div className="statchip">
          <b>{rooms.length}</b>
          <span><Ic name="grid" size={12} /> classrooms</span>
        </div>
        <div className="statchip">
          <b>{rooms.filter((r) => r.is_published).length}</b>
          <span><Ic name="eye" size={12} /> published</span>
        </div>
        <div className="statchip">
          <b>{rooms.reduce((n, r) => n + (r.enrolled ?? 0), 0)}</b>
          <span><Ic name="users" size={12} /> seats filled</span>
        </div>
        <div className="statchip">
          <b>{rooms.filter((r) => (r.enrolled ?? 0) >= (r.capacity ?? 0) && (r.capacity ?? 0) > 0).length}</b>
          <span><Ic name="alertCircle" size={12} /> full</span>
        </div>
      </div>

      <section className="reb-card" style={{ marginBottom: 18 }}>
        <SecHead icon="plus" title="New classroom" />
        <form onSubmit={create} className="grid2">
          <div className="field">
            <label className="kind" htmlFor="cr-title">Title</label>
            <input id="cr-title" className="reb-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Backend Cohort - September" />
          </div>
          <div className="field">
            <label className="kind" htmlFor="cr-slug">Web address</label>
            <input id="cr-slug" className="reb-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required placeholder="backend-cohort-september" />
          </div>
          <div className="field">
            <label className="kind" htmlFor="cr-level">Level</label>
            <select id="cr-level" className="reb-input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
          <div className="field">
            <label className="kind" htmlFor="cr-price">Price (kobo)</label>
            <input id="cr-price" className="reb-input" type="number" min={0} value={form.price_kobo} onChange={(e) => setForm({ ...form, price_kobo: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label className="kind" htmlFor="cr-cap">Seats</label>
            <input id="cr-cap" className="reb-input" type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label className="kind" htmlFor="cr-sched">Timetable</label>
            <input id="cr-sched" className="reb-input" value={form.schedule_text} onChange={(e) => setForm({ ...form, schedule_text: e.target.value })} placeholder="Tuesdays & Thursdays, 18:00 WAT" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="reb-btn pri">
              <Ic name="plus" size={14} /> Create classroom
            </button>
          </div>
        </form>
      </section>

      {loading && rooms.length === 0 ? (
        <SkList rows={3} />
      ) : rooms.length === 0 ? (
        <Emp icon="grid" title="No classrooms yet" note="Create one above. It appears here and in the learner catalog once published." />
      ) : (
        <div className="kgrid">
          {rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              className="tile"
              onClick={() => setOpenId(r.id)}
              style={{ textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span className="tico" style={{ width: 34, height: 34 }}><Ic name="grid" size={15} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</b>
                  <span className="hint" style={{ fontSize: 11.5 }}>{r.slug}</span>
                </span>
                <Badge tone={r.is_published ? "ok" : "warn"}>{r.is_published ? "Live" : "Draft"}</Badge>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--muted)" }}>
                <span style={{ display: "flex", gap: 5, alignItems: "center" }}><Ic name="users" size={12} /> {seats(r)}</span>
                <span style={{ display: "flex", gap: 5, alignItems: "center" }}><Ic name="dollar" size={12} /> {money(r)}</span>
                {r.level ? <span style={{ display: "flex", gap: 5, alignItems: "center" }}><Ic name="layers" size={12} /> {r.level}</span> : null}
              </div>
              <span className="hint" style={{ fontSize: 11.5, display: "flex", gap: 6, alignItems: "center" }}>
                <Ic name="calendarCheck" size={12} /> {r.schedule_text || "Timetable not set"}
              </span>
            </button>
          ))}
        </div>
      )}

      <Drawer open={Boolean(openId)} onClose={() => setOpenId(null)}>
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>{detail?.title ?? (detailLoading ? "Loading..." : "Classroom")}</h3>
            <span className="hint">{detail ? detail.slug : ""}</span>
          </div>
          <button type="button" className="reb-btn ghost sm" onClick={() => setOpenId(null)} aria-label="Close">
            <Ic name="x" size={14} />
          </button>
        </div>
        <div className="drawer-body">
          {detailErr ? <Err msg={detailErr} onRetry={() => setOpenId((v) => v)} /> : null}
          {detailLoading && !detail ? (
            <SkList rows={3} />
          ) : detail ? (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <Badge tone={detail.is_published ? "ok" : "warn"}>{detail.is_published ? "Published" : "Draft"}</Badge>
                {detail.level ? <Badge tone="info">{detail.level}</Badge> : null}
                <Badge tone={(detail.enrolled ?? 0) >= (detail.capacity ?? 0) && (detail.capacity ?? 0) > 0 ? "danger" : ""}>
                  {seats(detail)} seats
                </Badge>
              </div>

              <Kv k="Price">{money(detail)}</Kv>
              <Kv k="Capacity">{detail.capacity ?? "-"}</Kv>
              <Kv k="Seats left">{Math.max(0, (detail.capacity ?? 0) - (detail.enrolled ?? 0))}</Kv>
              <Kv k="Timetable">{detail.schedule_text || "Not set"}</Kv>
              <Kv k="Starts">{detail.starts_at ? shortDate(detail.starts_at) : "Not set"}</Kv>
              {detail.description ? <Kv k="Description">{detail.description}</Kv> : null}

              <div className="sec-head" style={{ marginTop: 18 }}>
                <Ic name="users" size={14} />
                <h3 style={{ fontSize: 13.5 }}>Members</h3>
                <span className="sp" />
                <span className="badge">{(detail.members ?? []).length}</span>
              </div>
              {(detail.members ?? []).length === 0 ? (
                <p className="hint">No learners enrolled yet.</p>
              ) : (
                (detail.members ?? []).map((m) => (
                  <div className="trow" key={m.id}>
                    <span className="tico" style={{ width: 30, height: 30, fontSize: 11 }}>{(m.full_name || m.email).slice(0, 2).toUpperCase()}</span>
                    <span className="tbody">
                      <b>{m.full_name || "Unnamed learner"}</b>
                      <span>{m.email}</span>
                    </span>
                    <Badge tone={m.is_active ? "ok" : "danger"}>{m.is_active ? "Active" : "Disabled"}</Badge>
                  </div>
                ))
              )}

              <div className="sec-head" style={{ marginTop: 18 }}>
                <Ic name="calendarCheck" size={14} />
                <h3 style={{ fontSize: 13.5 }}>Sessions</h3>
                <span className="sp" />
                <span className="badge">{(detail.sessions ?? []).length}</span>
              </div>
              {(detail.sessions ?? []).length === 0 ? (
                <p className="hint">No sessions scheduled.</p>
              ) : (
                (detail.sessions ?? []).map((s) => (
                  <div className="trow" key={s.id}>
                    <span className="tico" style={{ width: 30, height: 30 }}><Ic name="video" size={13} /></span>
                    <span className="tbody">
                      <b>{s.title}</b>
                      <span>{s.starts_at ? shortDate(s.starts_at) : "Date to be confirmed"}</span>
                    </span>
                    <Badge tone={s.status === "live" ? "danger" : s.status === "ended" ? "" : "info"}>{s.status ?? "scheduled"}</Badge>
                  </div>
                ))
              )}

              <div className="sec-head" style={{ marginTop: 18 }}>
                <Ic name="folder" size={14} />
                <h3 style={{ fontSize: 13.5 }}>Materials and work</h3>
              </div>
              <Kv k="Files">{(detail.materials ?? []).length}</Kv>
              <Kv k="Assignments">{(detail.assignments ?? []).length}</Kv>
              <Kv k="Announcements">{(detail.announcements ?? []).length}</Kv>
            </>
          ) : null}
        </div>
        <div className="drawer-foot">
          {detail ? (
            <button type="button" className={`reb-btn ${detail.is_published ? "ghost" : "pri"}`} disabled={busy === detail.id} onClick={() => void toggle(detail)}>
              <Ic name={detail.is_published ? "eye" : "check"} size={14} />
              {busy === detail.id ? "Saving..." : detail.is_published ? "Unpublish" : "Publish"}
            </button>
          ) : null}
          {detail ? (
            <Link className="reb-btn ghost sm" href={`/classrooms/${detail.id}`}>
              <Ic name="external" size={13} /> Full page
            </Link>
          ) : null}
        </div>
      </Drawer>
    </Shell>
  );
}
