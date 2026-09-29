"use client";
import { useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useToast } from "@/components/dashboard/preferences";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { shortDate, shortDateTime } from "@/components/ui/primitives";
import { api, money } from "@/lib/dashboard-api";
import { useMutation } from "@/lib/use-dashboard";

/*
  Book 1-on-1 — a real booking request (POST /bookings) plus the bookings on
  your account. The instructor sets the price afterwards; until then a booking
  honestly says "price pending" rather than showing a number.
*/

const DURATIONS = [30, 60, 90, 120];
const MODES = ["online", "in person"];

export default function BookPage() {
  const { data, reload } = useDashboard();
  const { push } = useToast();
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState("online");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");

  const create = useMutation(async () =>
    api.createBooking({
      topic: topic.trim(),
      duration_min: duration,
      mode,
      preferred_date: date || null,
      preferred_time: time,
      message: message.trim(),
    })
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    const r = await create.run();
    if (r) {
      setTopic("");
      setMessage("");
      push("Booking requested. We confirm the slot and price shortly.");
      await reload();
    }
  }

  const mine = data?.bookings ?? [];

  return (
    <>
      <PageHead
        title="Book 1-on-1"
        sub="Private session with an instructor. Agree the time, then we set the price before you pay."
      />

      <div className="grid2">
        <section className="card" aria-label="New booking">
          <h2 className="eyebrow-sm" style={{ marginBottom: 12 }}>Request a session</h2>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
            <div>
              <label className="fc-sr-only" htmlFor="bk-topic">Topic</label>
              <input
                id="bk-topic"
                className="input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What should we cover?"
                required
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label className="fc-sr-only" htmlFor="bk-dur">Duration</label>
              <select id="bk-dur" className="select" value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={{ width: "auto" }}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d} minutes</option>
                ))}
              </select>
              <label className="fc-sr-only" htmlFor="bk-mode">Mode</label>
              <select id="bk-mode" className="select" value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: "auto" }}>
                {MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="fc-sr-only" htmlFor="bk-date">Preferred date</label>
                <input id="bk-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="fc-sr-only" htmlFor="bk-time">Preferred time</label>
                <input id="bk-time" className="input" value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 16:00" />
              </div>
            </div>
            <div>
              <label className="fc-sr-only" htmlFor="bk-msg">Anything else</label>
              <textarea
                id="bk-msg"
                className="textarea"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Context, links, deadlines…"
              />
            </div>

            {create.error && <p style={{ color: "var(--danger, #fca5a5)", fontSize: 13 }} role="alert">{create.error}</p>}

            <button type="submit" className="btn pri" disabled={create.pending || !topic.trim()}>
              <Icon name="calendarCheck" size={15} /> {create.pending ? "Requesting…" : "Request session"}
            </button>
          </form>
        </section>

        <section className="card" aria-label="Your bookings">
          <h2 className="eyebrow-sm" style={{ marginBottom: 12 }}>Your bookings · {mine.length}</h2>
          {mine.length === 0 ? (
            <div className="empty" style={{ padding: "26px 8px" }}>
              <div className="ico"><Icon name="calendar" size={22} /></div>
              <h3>No bookings yet</h3>
              <p>Request a session on the left — we confirm the slot, set a price, then you pay.</p>
            </div>
          ) : (
            <div className="qa" style={{ marginBottom: 0 }}>
              {mine.map((b) => (
                <article key={b.id} className="qa" style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="badge">{b.status}</span>
                    <span className="badge">{b.mode}</span>
                    <span className="hint" style={{ marginLeft: "auto" }}>
                      {b.price_kobo ? money(b.price_kobo) : "price pending"}
                    </span>
                  </div>
                  <p style={{ fontWeight: 700, marginTop: 6 }}>{b.topic}</p>
                  <p className="hint">
                    {b.duration_min} min · {b.preferred_date ? shortDate(b.preferred_date) : "date TBD"}
                    {b.preferred_time ? ` at ${b.preferred_time}` : ""} · requested {shortDate(b.created_at)}
                  </p>
                  {b.status === "confirmed" || b.status === "paid" ? (
                    <p className="hint" style={{ marginTop: 4 }}>
                      Confirmed — the live room opens from your{" "}
                      <a href={`/bookings/${b.id}`} style={{ color: "var(--brand-text)" }}>booking page</a>.
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="hint" style={{ marginTop: 14 }}>
        Latest activity: {shortDateTime(data?.transactions[0]?.created_at ?? null)} on your account.
      </p>
    </>
  );
}
