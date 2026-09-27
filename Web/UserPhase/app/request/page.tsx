"use client";
import Link from "next/link";
import { useState } from "react";
import { PageHead } from "@/components/dashboard/shell";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useToast } from "@/components/dashboard/preferences";
import { Icon } from "@/components/ui/icons";
import { Alert, EmptyState, Field, LoadingGrid, StatusBadge, shortDate } from "@/components/ui/primitives";
import { api } from "@/lib/dashboard-api";
import { useAsync, useMutation } from "@/lib/use-dashboard";

/*
  Class Requests — the real "request a topic" flow.
  Writes POST /requests with the exact payload the backend expects; queues come
  from GET /scope/requests/open and POST /scope/requests/:id/join.
*/

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const EMPTY = {
  topic: "",
  current_level: "Beginner",
  background: "",
  goals: "",
  preferred_days: "",
  preferred_time: "",
  preferred_schedule: "",
  mode: "online",
  audience: "individual",
  budget_kobo: 0,
  message: "",
};

export default function RequestPage() {
  const { data, reload: reloadShell } = useDashboard();
  const { push } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [joinedMsg, setJoinedMsg] = useState("");

  const open = useAsync(() => api.openRequests(), []);
  const status = data?.requests;

  const create = useMutation(async (payload: Record<string, unknown>) => {
    const r = await api.createRequest(payload);
    setForm(EMPTY);
    push("Request sent — we review every one personally.");
    return r;
  });

  const join = useMutation(async (id: string) => {
    const r = await api.joinRequest(id);
    setJoinedMsg(`You are #${r.position} in the queue — we will notify you.`);
    open.reload();
    reloadShell();
    return r;
  });

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <PageHead
        title="Class Requests"
        sub="Can't find your topic? Describe it and we build a classroom around you."
        actions={
          <Link href="/learn" className="fc-btn fc-btn-ghost">
            <Icon name="compass" size={16} /> Browse catalog
          </Link>
        }
      />

      {create.error && <Alert tone="danger">{create.error}</Alert>}
      {join.error && <Alert tone="danger">{join.error}</Alert>}
      {joinedMsg && <Alert tone="ok">{joinedMsg}</Alert>}

      <div className="fc-band">
        {/* Request form */}
        <section className="fc-card" aria-labelledby="rq-form-head">
          <div className="fc-sec-head">
            <h2 className="fc-sec-title" id="rq-form-head">
              Tell us what you need
            </h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (form.topic.trim()) void create.run(form);
            }}
          >
            <Field label="What do you want to learn?" htmlFor="rq-topic">
              <input
                id="rq-topic"
                className="fc-input"
                required
                value={form.topic}
                onChange={(e) => set("topic", e.target.value)}
                placeholder="e.g. Node.js + PostgreSQL backend architecture"
              />
            </Field>

            <div className="fc-grid-2">
              <Field label="Current level" htmlFor="rq-level">
                <select id="rq-level" className="fc-select" value={form.current_level} onChange={(e) => set("current_level", e.target.value)}>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Budget (NGN)" htmlFor="rq-budget" hint="Leave 0 if you would like a quote instead.">
                <input
                  id="rq-budget"
                  className="fc-input"
                  type="number"
                  min={0}
                  value={Math.round(form.budget_kobo / 100)}
                  onChange={(e) => set("budget_kobo", Number(e.target.value) * 100)}
                />
              </Field>
            </div>

            <Field label="What do you already know?" htmlFor="rq-background">
              <textarea id="rq-background" className="fc-textarea" rows={2} value={form.background} onChange={(e) => set("background", e.target.value)} />
            </Field>

            <Field label="What do you want to achieve?" htmlFor="rq-goals">
              <textarea id="rq-goals" className="fc-textarea" rows={2} value={form.goals} onChange={(e) => set("goals", e.target.value)} />
            </Field>

            <div className="fc-grid-2">
              <Field label="Preferred days" htmlFor="rq-days">
                <input id="rq-days" className="fc-input" value={form.preferred_days} onChange={(e) => set("preferred_days", e.target.value)} placeholder="e.g. Tue + Thu" />
              </Field>
              <Field label="Preferred time" htmlFor="rq-time">
                <input id="rq-time" className="fc-input" value={form.preferred_time} onChange={(e) => set("preferred_time", e.target.value)} placeholder="e.g. evenings" />
              </Field>
            </div>

            <div className="fc-grid-2">
              <Field label="Online or physical" htmlFor="rq-mode">
                <select id="rq-mode" className="fc-select" value={form.mode} onChange={(e) => set("mode", e.target.value)}>
                  <option value="online">Online</option>
                  <option value="physical">Physical</option>
                </select>
              </Field>
              <Field label="Individual or group" htmlFor="rq-audience">
                <select id="rq-audience" className="fc-select" value={form.audience} onChange={(e) => set("audience", e.target.value)}>
                  <option value="individual">Individual</option>
                  <option value="group">Group</option>
                </select>
              </Field>
            </div>

            <Field label="Anything else?" htmlFor="rq-message">
              <textarea id="rq-message" className="fc-textarea" rows={2} value={form.message} onChange={(e) => set("message", e.target.value)} />
            </Field>

            <button type="submit" className="fc-btn fc-btn-primary fc-btn-block" disabled={create.pending}>
              <Icon name="sparkles" size={16} /> {create.pending ? "Sending…" : "Send request"}
            </button>
          </form>
        </section>

        {/* Your activity */}
        <div className="fc-stack">
          <section className="fc-card" aria-labelledby="rq-mine">
            <div className="fc-sec-head">
              <h2 className="fc-sec-title" id="rq-mine">
                Your requests
              </h2>
            </div>
            {!status || status.mine.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--fc-muted)" }}>Nothing submitted yet.</p>
            ) : (
              status.mine.map((r) => (
                <div key={r.id} className="fc-row-item">
                  <span className="fc-row-main">
                    <span className="fc-row-title" style={{ display: "block" }}>
                      {r.topic}
                    </span>
                    <span className="fc-row-meta">
                      {r.waiting ?? 0} waiting · typically reviewed within {status.sla_hours}h
                    </span>
                  </span>
                  <StatusBadge status={r.status} />
                </div>
              ))
            )}
          </section>

          {status && status.joined.length > 0 && (
            <section className="fc-card" aria-labelledby="rq-joined">
              <div className="fc-sec-head">
                <h2 className="fc-sec-title" id="rq-joined">
                  Queues you joined
                </h2>
              </div>
              {status.joined.map((r) => (
                <div key={r.id} className="fc-row-item">
                  <span className="fc-row-main">
                    <span className="fc-row-title" style={{ display: "block" }}>
                      {r.topic}
                    </span>
                    <span className="fc-row-meta">
                      {r.classroom_slug
                        ? "Classroom ready"
                        : `Position #${r.position} of ${r.waiting} waiting`}
                    </span>
                    {r.classroom_slug && (
                      <Link href={`/classrooms/${r.classroom_slug}`} className="fc-btn fc-btn-primary fc-btn-sm" style={{ marginTop: 10 }}>
                        Enroll now <Icon name="arrowRight" size={14} />
                      </Link>
                    )}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </section>
          )}
        </div>
      </div>

      {/* Open queues */}
      <section style={{ marginTop: 24 }} aria-labelledby="rq-open">
        <div className="fc-sec-head">
          <h2 className="fc-sec-title" id="rq-open">
            Open requests — join the queue
          </h2>
          <button type="button" className="fc-btn-quiet fc-btn" onClick={open.reload}>
            <Icon name="refresh" size={14} /> Refresh
          </button>
        </div>
        <p style={{ fontSize: 13, color: "var(--fc-muted)", marginBottom: 16, maxWidth: "70ch" }}>
          Requests from other learners. Join a queue and we notify you the moment it becomes a classroom.
        </p>
        {open.error && <Alert tone="danger">{open.error}</Alert>}
        {open.loading ? (
          <LoadingGrid height={76} count={3} />
        ) : (open.data ?? []).length === 0 ? (
          <EmptyState icon="sparkles" title="No open requests right now" body="Be the first — submit your own request above and others can join it." />
        ) : (
          <div className="fc-card">
            {(open.data ?? []).map((r) => (
              <div key={r.id} className="fc-row-item">
                <span className="fc-row-main">
                  <span className="fc-row-title" style={{ display: "block" }}>
                    {r.topic}
                  </span>
                  <span className="fc-row-meta">
                    {[r.current_level, r.mode, `${r.waiting} waiting`, `opened ${shortDate(r.created_at)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <button
                  type="button"
                  className="fc-btn fc-btn-ghost fc-btn-sm"
                  disabled={join.pending}
                  onClick={() => void join.run(r.id)}
                  aria-label={`Join the queue for ${r.topic}`}
                >
                  Join queue
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
