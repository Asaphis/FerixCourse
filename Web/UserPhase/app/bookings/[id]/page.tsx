"use client";
import { useEffect, useRef, useState } from "react";
import { PageHead } from "@/components/dashboard/shell";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Icon } from "@/components/ui/icons";
import { shortDateTime } from "@/components/ui/primitives";
import { api, money, type Message } from "@/lib/dashboard-api";
import { useAsync, useMutation } from "@/lib/use-dashboard";

/*
  Booking workspace — the private room shared with the assigned instructor.
  GET /scope/bookings/:id for the booking + thread, POST .../messages to reply.
  Presentation is on the rebuild design (card / grid2 / gm-gbub thread), the
  data flow is unchanged.
*/

function DefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
      <dt style={{ color: "var(--muted)", fontSize: 13, flexShrink: 0 }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 13.5, fontWeight: 600, textAlign: "right", minWidth: 0 }}>{children}</dd>
    </div>
  );
}

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const { data: shell } = useDashboard();
  const detail = useAsync(() => api.booking(params.id), [params.id]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(detail.data?.messages ?? []);
  }, [detail.data]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = useMutation(async (body: string) => {
    const m = await api.sendBookingMessage(params.id, body);
    setMessages((prev) => [...prev, m]);
    return m;
  });

  const booking = detail.data?.booking;
  const price = booking?.price_kobo ?? 0;

  return (
    <>
      <PageHead
        title={booking?.topic || "Booking workspace"}
        sub="Your private room with the instructor — schedule, price and discussion live here."
        actions={
          <a href="/book" className="btn ghost sm">
            <Icon name="arrowLeft" size={15} /> All bookings
          </a>
        }
      />

      {detail.error && (
        <div className="alert danger" role="alert">
          <Icon name="alertCircle" size={17} />
          <span style={{ flex: 1, minWidth: 0 }}>{detail.error}</span>
          <button type="button" className="btn ghost sm" onClick={detail.reload}>
            Retry
          </button>
        </div>
      )}

      {detail.loading ? (
        <div className="skel" style={{ height: 200 }} />
      ) : !booking ? (
        <div className="card empty">
          <div className="ico">
            <Icon name="calendarCheck" size={24} />
          </div>
          <h3>Booking not found</h3>
          <p>It may have been removed, or the link is wrong.</p>
        </div>
      ) : (
        <div className="grid2" style={{ alignItems: "start" }}>
          <section className="card" aria-labelledby="bd-details">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <h2 id="bd-details" style={{ fontFamily: "var(--font-d)", fontSize: 15, fontWeight: 800 }}>
                Session
              </h2>
              <span className="badge">{booking.status}</span>
            </div>
            <dl style={{ margin: 0 }}>
              <DefRow label="Format">
                {booking.mode} · {booking.duration_min} minutes
              </DefRow>
              <DefRow label="Preferred slot">
                {booking.preferred_date || "Date to be confirmed"}
                {booking.preferred_time ? ` · ${booking.preferred_time}` : ""}
              </DefRow>
              {booking.location && <DefRow label="Location">{booking.location}</DefRow>}
              <DefRow label="Requested">{shortDateTime(booking.created_at)}</DefRow>
              <DefRow label="Agreed price">
                {price > 0 ? money(price) : "Not set yet — the instructor will confirm"}
              </DefRow>
            </dl>
            {booking.message && (
              <p
                style={{
                  marginTop: 16,
                  padding: "11px 14px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderLeft: "3px solid var(--brand)",
                  borderRadius: 12,
                  fontSize: 13.5,
                  color: "var(--muted)",
                }}
              >
                “{booking.message}”
              </p>
            )}
          </section>

          <section className="card" aria-labelledby="bd-thread">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h2 id="bd-thread" style={{ fontFamily: "var(--font-d)", fontSize: 15, fontWeight: 800 }}>
                Private discussion
              </h2>
              <button type="button" className="btn ghost sm" onClick={detail.reload}>
                <Icon name="refresh" size={14} /> Refresh
              </button>
            </div>
            <p className="hint" style={{ marginTop: 6, marginBottom: 10 }}>
              Agree on time, price and goals here. Only you and your instructor can read this.
            </p>

            <div
              className="thrlog"
              ref={scrollRef}
              role="log"
              aria-label="Booking discussion"
              style={{ maxHeight: 420, overflowY: "auto", padding: "4px 2px" }}
            >
              {messages.length === 0 && (
                <p className="sub">No messages yet — say hello and share your goals.</p>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === shell?.profile?.id;
                return (
                  <div key={m.id} className={`gm ${mine ? "mine" : ""}`}>
                    <div className="gbody">
                      <div className="gname">
                        <b>{mine ? "You" : "Instructor"}</b>
                        <span className="hint">{shortDateTime(m.created_at)}</span>
                      </div>
                      <div className="gbub">{m.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              className="composer"
              style={{ marginTop: 14 }}
              onSubmit={(e) => {
                e.preventDefault();
                const body = draft.trim();
                if (!body) return;
                void send.run(body).then((r) => {
                  if (r) setDraft("");
                });
              }}
            >
              <div className="field-wrap">
                <label className="fc-sr-only" htmlFor="bd-reply">
                  Write to your instructor
                </label>
                <input
                  id="bd-reply"
                  className="input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write to your instructor…"
                />
              </div>
              <button type="submit" className="btn pri" disabled={send.pending || !draft.trim()}>
                <Icon name="arrowRight" size={15} /> {send.pending ? "Sending…" : "Send"}
              </button>
            </form>
            {send.error && (
              <div className="alert danger" role="alert" style={{ marginTop: 12, marginBottom: 0 }}>
                <Icon name="alertCircle" size={17} />
                <span>{send.error}</span>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
