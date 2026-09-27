"use client";
import { useEffect, useRef, useState } from "react";
import { PageHead } from "@/components/dashboard/shell";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Icon } from "@/components/ui/icons";
import { Alert, EmptyState, StatusBadge, shortDateTime } from "@/components/ui/primitives";
import { api, money, type Message } from "@/lib/dashboard-api";
import { useAsync, useMutation } from "@/lib/use-dashboard";

/*
  Booking workspace — the private room shared with the assigned instructor.
  GET /scope/bookings/:id for the booking + thread, POST .../messages to reply.
*/

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
          <Link_BackToBookings />
        }
      />

      {detail.error && (
        <Alert tone="danger">
          {detail.error}{" "}
          <button type="button" className="fc-btn fc-btn-sm fc-btn-ghost" onClick={detail.reload}>
            Retry
          </button>
        </Alert>
      )}

      {detail.loading ? (
        <div className="fc-skel" style={{ height: 200 }} />
      ) : !booking ? (
        <EmptyState icon="calendarCheck" title="Booking not found" body="It may have been removed, or the link is wrong." />
      ) : (
        <div className="fc-band">
          <div className="fc-stack">
            <section className="fc-card" aria-labelledby="bd-details">
              <div className="fc-sec-head">
                <h2 className="fc-sec-title" id="bd-details">
                  Session
                </h2>
                <StatusBadge status={booking.status} />
              </div>
              <dl style={{ margin: 0 }}>
                <div className="fc-def-row">
                  <dt>Format</dt>
                  <dd>
                    {booking.mode} · {booking.duration_min} minutes
                  </dd>
                </div>
                <div className="fc-def-row">
                  <dt>Preferred slot</dt>
                  <dd>
                    {booking.preferred_date || "Date to be confirmed"}
                    {booking.preferred_time ? ` · ${booking.preferred_time}` : ""}
                  </dd>
                </div>
                {booking.location && (
                  <div className="fc-def-row">
                    <dt>Location</dt>
                    <dd>{booking.location}</dd>
                  </div>
                )}
                <div className="fc-def-row">
                  <dt>Requested</dt>
                  <dd>{shortDateTime(booking.created_at)}</dd>
                </div>
                <div className="fc-def-row">
                  <dt>Agreed price</dt>
                  <dd>{price > 0 ? money(price) : "Not set yet — the instructor will confirm"}</dd>
                </div>
              </dl>
              {booking.message && (
                <p className="fc-bubble" style={{ marginTop: 16 }}>
                  “{booking.message}”
                </p>
              )}
            </section>
          </div>

          <section className="fc-card" aria-labelledby="bd-thread">
            <div className="fc-sec-head">
              <h2 className="fc-sec-title" id="bd-thread">
                Private discussion
              </h2>
              <button type="button" className="fc-btn-quiet fc-btn" onClick={detail.reload}>
                <Icon name="refresh" size={14} /> Refresh
              </button>
            </div>
            <p className="fc-hint" style={{ marginBottom: 12 }}>
              Agree on time, price and goals here. Only you and your instructor can read this.
            </p>

            <div className="fc-thread" ref={scrollRef} role="log" aria-label="Booking discussion">
              {messages.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--fc-muted)" }}>No messages yet — say hello and share your goals.</p>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === shell?.profile?.id;
                return (
                  <div key={m.id}>
                    <p className="fc-thread-meta">
                      {mine ? "You" : "Instructor"} · {shortDateTime(m.created_at)}
                    </p>
                    <p className={`fc-bubble${mine ? " me" : ""}`}>{m.body}</p>
                  </div>
                );
              })}
            </div>

            <form
              className="fc-toolbar"
              style={{ marginTop: 16, marginBottom: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                const body = draft.trim();
                if (!body) return;
                void send.run(body).then((r) => {
                  if (r) setDraft("");
                });
              }}
            >
              <label className="fc-sr-only" htmlFor="bd-reply">
                Write to your instructor
              </label>
              <input
                id="bd-reply"
                className="fc-input"
                style={{ maxWidth: "none", flex: 1 }}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write to your instructor…"
              />
              <button type="submit" className="fc-btn fc-btn-primary" disabled={send.pending || !draft.trim()}>
                <Icon name="arrowRight" size={15} /> {send.pending ? "Sending…" : "Send"}
              </button>
            </form>
            {send.error && <Alert tone="danger">{send.error}</Alert>}
          </section>
        </div>
      )}
    </>
  );
}

function Link_BackToBookings() {
  return (
    <a href="/book" className="fc-btn fc-btn-ghost">
      <Icon name="arrowRight" size={16} style={{ transform: "rotate(180deg)" }} /> All bookings
    </a>
  );
}
