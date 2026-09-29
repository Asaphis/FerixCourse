"use client";
import Link from "next/link";
import { useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useToast } from "@/components/dashboard/preferences";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { shortDate } from "@/components/ui/primitives";
import { api } from "@/lib/dashboard-api";
import { useMutation } from "@/lib/use-dashboard";

/*
  Class requests — ask for a custom training track (POST /requests) and watch
  what you already asked for. The request queue (GET /scope/requests/status) is
  loaded by the shell, so joining a popular request costs no extra request.
*/

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const MODES = ["online", "in person", "hybrid"];

export default function RequestPage() {
  const { data, reload } = useDashboard();
  const { push } = useToast();
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [mode, setMode] = useState("online");
  const [goals, setGoals] = useState("");
  const [schedule, setSchedule] = useState("");

  const create = useMutation(async () => {
    return api.createRequest({
      topic: topic.trim(),
      current_level: level,
      mode,
      goals: goals.trim(),
      preferred_schedule: schedule.trim(),
    });
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    const r = await create.run();
    if (r) {
      setTopic("");
      setGoals("");
      setSchedule("");
      push("Request sent. We reply within the response window.");
      await reload();
    }
  }

  const mine = data?.requests.mine ?? [];
  const joined = data?.requests.joined ?? [];
  const sla = data?.requests.sla_hours ?? 48;

  return (
    <>
      <PageHead
        title="Class requests"
        sub={`Tell us the topic. We match you with an instructor — our response window is ${sla} hours.`}
      />

      <div className="grid2">
        <section className="card" aria-label="New request">
          <h2 className="eyebrow-sm" style={{ marginBottom: 12 }}>Request a track</h2>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
            <div>
              <label className="fc-sr-only" htmlFor="rq-topic">Topic</label>
              <input
                id="rq-topic"
                className="input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What do you want to learn?"
                required
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <label className="fc-sr-only" htmlFor="rq-level">Current level</label>
              <select id="rq-level" className="select" value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <label className="fc-sr-only" htmlFor="rq-mode">Mode</label>
              <select id="rq-mode" className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
                {MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="fc-sr-only" htmlFor="rq-goals">Goals</label>
              <textarea
                id="rq-goals"
                className="textarea"
                rows={3}
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="What should you be able to do afterwards?"
              />
            </div>
            <div>
              <label className="fc-sr-only" htmlFor="rq-sched">Preferred schedule</label>
              <input
                id="rq-sched"
                className="input"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="Preferred schedule (weekday evenings, weekends…)"
              />
            </div>

            {create.error && <p style={{ color: "var(--danger, #fca5a5)", fontSize: 13 }} role="alert">{create.error}</p>}

            <button type="submit" className="btn pri" disabled={create.pending || !topic.trim()}>
              <Icon name="sparkles" size={15} /> {create.pending ? "Sending…" : "Send request"}
            </button>
          </form>
        </section>

        <section className="card" aria-label="Your requests">
          <h2 className="eyebrow-sm" style={{ marginBottom: 12 }}>Your requests · {mine.length}</h2>
          {mine.length === 0 ? (
            <div className="empty" style={{ padding: "26px 8px" }}>
              <div className="ico"><Icon name="clipboardList" size={22} /></div>
              <h3>No requests yet</h3>
              <p>Send one on the left and we will come back to you with an instructor and a schedule.</p>
            </div>
          ) : (
            <div className="qa" style={{ marginBottom: 0 }}>
              {mine.map((r) => (
                <article key={r.id} className="qa" style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="badge">{r.status}</span>
                    <span className="hint" style={{ marginLeft: "auto" }}>{shortDate(r.created_at)}</span>
                  </div>
                  <p style={{ fontWeight: 700, marginTop: 6 }}>{r.topic}</p>
                  {r.converted_classroom_id ? (
                    <p className="hint">
                      Converted to a classroom —{" "}
                      {r.classroom_slug ? (
                        <Link href={`/classrooms/${r.classroom_slug}`} style={{ color: "var(--brand-text)" }}>open it</Link>
                      ) : (
                        "check your classrooms"
                      )}
                    </p>
                  ) : (
                    <p className="hint">Level {r.current_level} · {r.mode}</p>
                  )}
                </article>
              ))}
            </div>
          )}

          {joined.length > 0 && (
            <>
              <h2 className="eyebrow-sm" style={{ margin: "18px 0 10px" }}>Requests you joined</h2>
              <div className="qa" style={{ marginBottom: 0 }}>
                {joined.map((j) => (
                  <div key={j.id} className="qa" style={{ marginBottom: 8 }}>
                    <p style={{ fontWeight: 700 }}>{j.topic}</p>
                    <p className="hint">
                      Position {j.position} of {j.waiting} waiting · {j.status}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
