"use client";
import { useCallback, useEffect, useState } from "react";
import { getBroadcasts, post, shortDateTime } from "@/lib/admin";
import type { BroadcastAudience, BroadcastRow } from "@/lib/admin-types";
import { Badge, Emp, Err, Ic, Ph, SecHead, SkList, toast, ToastHost } from "@/components/reb-ui";
import { Shell } from "@/components/shell";

/*
  Broadcast — one message to a real audience. POST /admin/broadcast writes a
  notification row per recipient (in-app + email when configured) and records
  the send; GET /admin/broadcasts is the history. Recipient counts are the ones
  the server reports, never an estimate made in the browser.
*/

const AUDIENCES: Array<{ value: BroadcastAudience; label: string; note: string }> = [
  { value: "all", label: "Everyone", note: "All active accounts — students, instructors and admins." },
  { value: "active", label: "Active accounts", note: "Everyone whose account is enabled." },
  { value: "students", label: "Students", note: "Learners with a student account." },
  { value: "instructors", label: "Instructors & admins", note: "The teaching team." },
];

export default function BroadcastPage() {
  const [rows, setRows] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setRows(await getBroadcasts());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load broadcast history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setSendError("A title is required.");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const r = await post<{ id: string; sent: number }>("/admin/broadcast", {
        title: title.trim(),
        body: body.trim(),
        audience,
      });
      setTitle("");
      setBody("");
      await load();
      toast(`Sent to ${r.sent} recipient${r.sent === 1 ? "" : "s"}`);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Could not send the broadcast.");
    } finally {
      setSending(false);
    }
  }

  const chosen = AUDIENCES.find((a) => a.value === audience)!;

  return (
    <Shell>
      <Ph title="Broadcast" sub="Send one message to a real audience. Everyone gets it in-app, and by email when configured." />

      {error ? <Err msg={error} onRetry={() => void load()} /> : null}

      <div className="grid2">
        <section className="reb-card">
          <SecHead icon="megaphone" title="Compose" />
          <form onSubmit={send}>
            <div className="field">
              <label htmlFor="bc-title" className="kind">Title</label>
              <input
                id="bc-title"
                className="reb-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New cohort opens Monday"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="bc-body" className="kind">Message</label>
              <textarea
                id="bc-body"
                className="textarea"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What should they know?"
              />
            </div>
            <div className="field">
              <span className="kind">Audience</span>
              <div className="qa" style={{ marginBottom: 10 }}>
                {AUDIENCES.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    className={`reb-btn sm ${audience === a.value ? "pri" : "ghost"}`}
                    onClick={() => setAudience(a.value)}
                    aria-pressed={audience === a.value}
                    style={{ marginRight: 6, marginBottom: 6 }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="hint">{chosen.note}</p>
            </div>

            {sendError ? <Err msg={sendError} /> : null}

            <button type="submit" className="reb-btn pri" disabled={sending || !title.trim()}>
              <Ic name={sending ? "refresh" : "send"} size={15} /> {sending ? "Sending…" : "Send broadcast"}
            </button>
          </form>
        </section>

        <section className="reb-card">
          <SecHead icon="clock" title={`History · ${rows.length}`} />
          {loading ? (
            <SkList rows={3} />
          ) : rows.length === 0 ? (
            <Emp icon="megaphone" title="Nothing sent yet" note="Broadcasts you send are listed here with their real recipient counts." />
          ) : (
            <div>
              {rows.map((b) => (
                <article key={b.id} className="qa">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge tone="brand">{b.audience}</Badge>
                    <span className="hint" style={{ marginLeft: "auto" }}>{shortDateTime(b.created_at)}</span>
                  </div>
                  <p style={{ fontWeight: 700, marginTop: 6 }}>{b.title}</p>
                  {b.body ? <p className="sub" style={{ marginTop: 2 }}>{b.body.slice(0, 200)}</p> : null}
                  <p className="hint">{b.recipient_count} recipient{b.recipient_count === 1 ? "" : "s"}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      <ToastHost />
    </Shell>
  );
}
