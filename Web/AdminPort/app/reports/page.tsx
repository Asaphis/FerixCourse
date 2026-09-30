"use client";
import { useCallback, useEffect, useState } from "react";
import { getReports, money } from "@/lib/admin";
import type { ReportsData } from "@/lib/admin-types";
import { Badge, Emp, Err, Ic, Ph, SecHead, SkList } from "@/components/reb-ui";
import { Shell } from "@/components/shell";

/*
  Reports — twelve months of real aggregates from GET /admin/reports. Charts are
  plain CSS bars scaled to the largest month, so the numbers stay exact and
  readable with no chart library. Months with no activity show an empty bar
  rather than being dropped.
*/

function Bars({
  data,
  value,
  format,
  accent,
}: {
  data: Array<{ month: string }>;
  value: (row: { month: string }) => number;
  format: (n: number) => string;
  accent?: boolean;
}) {
  const rows = data as Array<{ month: string } & Record<string, number>>;
  const max = Math.max(1, ...rows.map((r) => Number(value(r as never)) || 0));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
        {rows.map((r) => {
          const n = Number(value(r as never)) || 0;
          const h = Math.round((n / max) * 100);
          return (
            <div key={r.month} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
              <span className="hint" style={{ fontSize: 10 }}>{n > 0 ? format(n) : ""}</span>
              <div
                title={`${r.month}: ${format(n)}`}
                style={{
                  width: "100%",
                  height: `${Math.max(h, n > 0 ? 4 : 2)}%`,
                  borderRadius: "6px 6px 2px 2px",
                  background: n > 0 ? (accent ? "linear-gradient(180deg,#e11d48,#f97316)" : "linear-gradient(180deg,#f97316,#fb923c)") : "var(--surface3)",
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        {rows.map((r) => (
          <span key={r.month} className="hint" style={{ flex: 1, textAlign: "center", fontSize: 9.5, overflow: "hidden" }}>
            {r.month.slice(5)}/{r.month.slice(2, 4)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await getReports());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Shell>
      <Ph
        title="Reports"
        sub={data ? `Last 12 months · from ${new Date(data.range.from).toLocaleDateString()}` : "Last 12 months of real activity."}
      />

      {error ? <Err msg={error} onRetry={() => void load()} /> : null}

      {loading ? (
        <SkList rows={4} />
      ) : !data ? null : data.revenue.length === 0 && data.totals.enrollments === 0 ? (
        <div className="reb-card">
          <Emp icon="activity" title="No activity in the last 12 months" note="Revenue, signups and enrollments will chart here once there is real data." />
        </div>
      ) : (
        <>
          <div className="statline" style={{ marginBottom: 18 }}>
            <div className="tile">
              <h3><Ic name="dollar" size={14} /> Revenue</h3>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{money(data.totals.revenue_kobo)}</div>
              <p className="hint">{data.totals.successful_payments} successful payments</p>
            </div>
            <div className="tile">
              <h3><Ic name="users" size={14} /> Learners</h3>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{data.totals.students}</div>
              <p className="hint">{data.totals.enrollments} enrollments</p>
            </div>
            <div className="tile">
              <h3><Ic name="bookOpen" size={14} /> Catalog</h3>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{data.totals.courses + data.totals.classrooms}</div>
              <p className="hint">
                {data.totals.courses} courses · {data.totals.classrooms} cohorts
              </p>
            </div>
            <div className="tile">
              <h3><Ic name="inbox" size={14} /> Open work</h3>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{data.totals.open_requests + data.totals.pending_bookings}</div>
              <p className="hint">
                {data.totals.open_requests} requests · {data.totals.pending_bookings} bookings
              </p>
            </div>
          </div>

          <div className="grid2" style={{ marginBottom: 18 }}>
            <section className="reb-card">
              <SecHead icon="dollar" title="Revenue by month" />
              <Bars data={data.revenue} value={(r) => Number((r as { kobo?: number }).kobo ?? 0)} format={(n) => money(n)} accent />
            </section>
            <section className="reb-card">
              <SecHead icon="users" title="Enrollments by month" />
              <Bars data={data.enrollments} value={(r) => Number((r as { count?: number }).count ?? 0)} format={(n) => String(n)} />
            </section>
          </div>

          <div className="grid2" style={{ marginBottom: 18 }}>
            <section className="reb-card">
              <SecHead icon="user" title="New accounts by month" />
              <Bars data={data.signups} value={(r) => Number((r as { count?: number }).count ?? 0)} format={(n) => String(n)} />
            </section>
            <section className="reb-card">
              <SecHead icon="layers" title="Top products" />
              {data.top.length === 0 ? (
                <Emp icon="layers" title="No products yet" note="Create a course or cohort to start tracking enrollments." />
              ) : (
                <div>
                  {data.top.map((t) => (
                    <div key={`${t.kind}-${t.title}`} className="qa" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className="ttl" style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: 13.5 }}>{t.title}</b>
                        <span className="hint" style={{ display: "block" }}>{t.kind}</span>
                      </span>
                      <Badge tone="info">{t.enrolled} enrolled</Badge>
                      <span style={{ fontWeight: 700, fontSize: 12.5 }}>{money(t.revenue_kobo)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="reb-card">
            <SecHead icon="filter" title="Funnel" />
            <div className="kgrid">
              <div className="tile">
                <h3><Ic name="sparkles" size={14} /> Training requests</h3>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{data.funnel.requests}</div>
              </div>
              <div className="tile">
                <h3><Ic name="calendarCheck" size={14} /> Bookings</h3>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{data.funnel.bookings}</div>
              </div>
              <div className="tile">
                <h3><Ic name="graduationCap" size={14} /> Enrollments</h3>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{data.funnel.enrollments}</div>
              </div>
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}
