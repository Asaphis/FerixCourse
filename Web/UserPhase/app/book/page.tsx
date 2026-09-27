"use client";
import Link from "next/link";
import { useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useToast } from "@/components/dashboard/preferences";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { Alert, EmptyState, Field, LoadingGrid, StatusBadge, shortDateTime } from "@/components/ui/primitives";
import { api } from "@/lib/dashboard-api";
import { useMutation } from "@/lib/use-dashboard";

/*
  Book 1-on-1 training. Writes POST /bookings with the exact payload the
  backend expects, and lists your existing bookings from GET /bookings/mine
  (already loaded once in the dashboard context).
*/

const DURATIONS: Array<[number, string]> = [
  [30, "30 minutes"],
  [60, "1 hour"],
  [120, "2 hours"],
  [240, "Half day"],
  [480, "Full day"],
];

const EMPTY = {
  topic: "",
  duration_min: 60,
  mode: "online",
  preferred_date: "",
  preferred_time: "",
  location: "",
  message: "",
};

export default function BookPage() {
  const { data, reload } = useDashboard();
  const { push } = useToast();
  const [form, setForm] = useState(EMPTY);

  const create = useMutation(async (payload: Record<string, unknown>) => {
    const b = await api.createBooking(payload);
    setForm(EMPTY);
    push("Booking received — an instructor will confirm shortly.");
    reload();
    return b;
  });

  const bookings = data?.bookings ?? [];
  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <PageHead
        title="Book 1-on-1 training"
        sub="Private mentorship, online or in person. Every booking starts as pending until an instructor confirms."
      />

      {create.error && <Alert tone="danger">{create.error}</Alert>}

      <div className="fc-band">
        <section className="fc-card" aria-labelledby="bk-form-head">
          <div className="fc-sec-head">
            <h2 className="fc-sec-title" id="bk-form-head">
              Session details
            </h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (form.topic.trim()) void create.run(form);
            }}
          >
            <Field label="What do you want to learn?" htmlFor="bk-topic">
              <input
                id="bk-topic"
                className="fc-input"
                required
                value={form.topic}
                onChange={(e) => set("topic", e.target.value)}
                placeholder="e.g. React hooks in depth"
              />
            </Field>

            <div className="fc-grid-2">
              <Field label="Duration" htmlFor="bk-duration">
                <select
                  id="bk-duration"
                  className="fc-select"
                  value={form.duration_min}
                  onChange={(e) => set("duration_min", Number(e.target.value))}
                >
                  {DURATIONS.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Format" htmlFor="bk-mode">
                <select id="bk-mode" className="fc-select" value={form.mode} onChange={(e) => set("mode", e.target.value)}>
                  <option value="online">Online</option>
                  <option value="physical">Physical</option>
                </select>
              </Field>
            </div>

            <div className="fc-grid-2">
              <Field label="Preferred date" htmlFor="bk-date">
                <input id="bk-date" className="fc-input" type="date" value={form.preferred_date} onChange={(e) => set("preferred_date", e.target.value)} />
              </Field>
              <Field label="Preferred time" htmlFor="bk-time">
                <input id="bk-time" className="fc-input" value={form.preferred_time} onChange={(e) => set("preferred_time", e.target.value)} placeholder="e.g. 6pm WAT" />
              </Field>
            </div>

            {form.mode === "physical" && (
              <Field label="Location" htmlFor="bk-location">
                <input id="bk-location" className="fc-input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="City / venue" />
              </Field>
            )}

            <Field label="Anything else?" htmlFor="bk-message">
              <textarea id="bk-message" className="fc-textarea" rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Goals, background, questions…" />
            </Field>

            <button type="submit" className="fc-btn fc-btn-primary fc-btn-block" disabled={create.pending}>
              <Icon name="calendarCheck" size={16} /> {create.pending ? "Booking…" : "Request booking"}
            </button>
          </form>
        </section>

        <section className="fc-card" aria-labelledby="bk-mine">
          <div className="fc-sec-head">
            <h2 className="fc-sec-title" id="bk-mine">
              Your bookings
            </h2>
            {bookings.length > 0 && <span className="fc-badge fc-badge-neutral">{bookings.length}</span>}
          </div>
          {!data ? (
            <LoadingGrid height={78} count={2} />
          ) : bookings.length === 0 ? (
            <EmptyState
              icon="calendarCheck"
              title="No bookings yet"
              body="Once you book a session it appears here with its private discussion room."
            />
          ) : (
            bookings.map((b) => (
              <div key={b.id} className="fc-row-item">
                <span className="fc-row-main">
                  <span className="fc-row-title" style={{ display: "block" }}>
                    {b.topic}
                  </span>
                  <span className="fc-row-meta">
                    {b.preferred_date || "Date TBC"} · {b.duration_min} min · {b.mode}
                    {b.preferred_time ? ` · ${b.preferred_time}` : ""}
                  </span>
                  <span className="fc-row-meta">Requested {shortDateTime(b.created_at)}</span>
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <StatusBadge status={b.status} />
                  <Link href={`/bookings/${b.id}`} className="fc-btn fc-btn-ghost fc-btn-sm">
                    Open room
                  </Link>
                </span>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}
