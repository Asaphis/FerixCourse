"use client";
import { useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { Ic, SecHead, SkList, Emp, Err, Badge, Kv, downloadCsv, toast } from "@/components/reb-ui";
import { useAdmin } from "@/lib/use-admin";
import { money, shortDateTime, timeAgo } from "@/lib/admin";

/*
  Payments & Transactions — rebuilt on the console's own components.

  Before: a 33-line placeholder that rendered a bare list with no search, no
  filters, no receipt and no summary, so a recorded payment was effectively
  invisible. The backend already returned everything (/admin/transactions);
  only this screen was missing.

  Follows the console's two house rules (see lib/use-admin.ts):
    1. a failed request is never rendered as "you have nothing" — error and
       empty are separate states with their own UI;
    2. nothing sets state after unmount (handled inside useAdmin).

  Layout notes: one markup serves desktop and phone. Below 720px fix.css
  stacks .tbl rows into label/value cards, so no column is ever cut off.
*/

type Tx = {
  id: string;
  user_id: string;
  user_email?: string | null;
  amount_kobo: number;
  currency?: string | null;
  product_type?: string | null;
  product_id?: string | null;
  flutterwave_ref?: string | null;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
};

type Filter = "all" | "successful" | "pending" | "failed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "successful", label: "Successful" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
];

const tone = (status?: string | null): "" | "ok" | "warn" | "danger" | "info" =>
  status === "successful" ? "ok" : status === "failed" ? "danger" : status === "pending" ? "warn" : "info";

const title = (status?: string | null) =>
  status === "successful" ? "Successful" : status === "failed" ? "Failed" : status === "pending" ? "Pending" : "Unknown";

export default function TransactionsPage() {
  const { data, loading, error, reload } = useAdmin<Tx[]>("/admin/transactions");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((t) => {
      const status = (t.status ?? "").toLowerCase();
      if (filter !== "all" && status !== filter) return false;
      if (!needle) return true;
      return [t.user_email, t.user_id, t.flutterwave_ref, t.product_type, t.id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, q, filter]);

  const stats = useMemo(() => {
    const ok = rows.filter((t) => t.status === "successful");
    const pending = rows.filter((t) => t.status === "pending");
    const failed = rows.filter((t) => t.status === "failed");
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = ok.filter((t) => {
      const d = t.completed_at ?? t.created_at;
      return d ? new Date(d).getTime() >= startOfDay.getTime() : false;
    });
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const week = ok.filter((t) => {
      const d = t.completed_at ?? t.created_at;
      return d ? new Date(d).getTime() >= weekAgo : false;
    });
    const rate = rows.length ? Math.round((ok.length / rows.length) * 100) : 0;
    return {
      todayKobo: today.reduce((s, t) => s + Number(t.amount_kobo || 0), 0),
      todayCount: today.length,
      weekKobo: week.reduce((s, t) => s + Number(t.amount_kobo || 0), 0),
      weekCount: week.length,
      okCount: ok.length,
      pending,
      failed,
      rate,
      needsAttention: pending.length + failed.length,
    };
  }, [rows]);

  const selected = useMemo(() => rows.find((t) => t.id === selectedId) ?? null, [rows, selectedId]);

  const counts: Record<Filter, number> = {
    all: rows.length,
    successful: stats.okCount,
    pending: stats.pending.length,
    failed: stats.failed.length,
  };

  function exportCsv() {
    if (!filtered.length) {
      toast("Nothing to export yet", "info");
      return;
    }
    downloadCsv("ferix-payments.csv", [
      ["Date", "Learner", "Product", "Reference", "Status", "Amount", "Currency"],
      ...filtered.map((t) => [
        shortDateTime(t.completed_at ?? t.created_at),
        t.user_email ?? t.user_id,
        t.product_type ?? "",
        t.flutterwave_ref ?? "",
        t.status ?? "",
        (Number(t.amount_kobo || 0) / 100).toFixed(2),
        t.currency ?? "NGN",
      ]),
    ]);
    toast("Exported " + filtered.length + " payments", "check");
  }

  function copy(value: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(value).then(
        () => toast("Copied", "check"),
        () => toast("Could not copy", "info")
      );
    }
  }

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div className="eyebrow">ADMIN · PAYMENTS</div>
          <h1>Payments</h1>
          <p className="hint">
            Every checkout, confirmation and receipt — retained per transaction with its provider reference.
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="reb-btn ghost sm" onClick={reload}>
            <Ic name="refresh" size={15} /> Refresh
          </button>
          <button className="reb-btn sm" onClick={exportCsv}>
            <Ic name="download" size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* summary — hidden while loading, so there is never a row of zeros that
          looks like "no money came in" when the request is still in flight */}
      {!loading && !error && rows.length > 0 && (
        <div className="statline">
          <div className="tile">
            <div className="hint">TODAY</div>
            <div style={{ font: "700 24px Archivo, sans-serif", marginTop: 6 }}>{money(stats.todayKobo)}</div>
            <div className="hint">{stats.todayCount} payment{stats.todayCount === 1 ? "" : "s"}</div>
          </div>
          <div className="tile">
            <div className="hint">LAST 7 DAYS</div>
            <div style={{ font: "700 24px Archivo, sans-serif", marginTop: 6 }}>{money(stats.weekKobo)}</div>
            <div className="hint">{stats.weekCount} payment{stats.weekCount === 1 ? "" : "s"}</div>
          </div>
          <div className="tile">
            <div className="hint">SUCCESS RATE</div>
            <div style={{ font: "700 24px Archivo, sans-serif", marginTop: 6 }}>{stats.rate}%</div>
            <div className="hint">{stats.okCount} successful of {rows.length}</div>
          </div>
          <div className="tile">
            <div className="hint">NEEDS ATTENTION</div>
            <div style={{ font: "700 24px Archivo, sans-serif", marginTop: 6 }}>{stats.needsAttention}</div>
            <div className="hint">{stats.pending.length} pending · {stats.failed.length} failed</div>
          </div>
        </div>
      )}

      {/* needs attention — the two things an operator actually has to act on */}
      {!loading && !error && stats.needsAttention > 0 && (
        <div className="reb-card" style={{ marginBottom: 14 }}>
          <SecHead icon="alertCircle" title="Needs attention" />
          <div className="qa">
            {stats.pending.slice(0, 4).map((t) => (
              <div className="qrow" key={t.id} onClick={() => setSelectedId(t.id)}>
                <div>
                  <div style={{ fontWeight: 600 }}>{money(t.amount_kobo, t.currency ?? "NGN")} still pending</div>
                  <div className="hint">{t.user_email ?? t.user_id} · {timeAgo(t.created_at)} · {t.flutterwave_ref ?? "no reference"}</div>
                </div>
                <button className="reb-btn ghost sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); copy(t.user_email ?? t.user_id); }}>
                  Copy email
                </button>
              </div>
            ))}
            {stats.failed.slice(0, 4).map((t) => (
              <div className="qrow" key={t.id} onClick={() => setSelectedId(t.id)}>
                <div>
                  <div style={{ fontWeight: 600 }}>{money(t.amount_kobo, t.currency ?? "NGN")} did not complete</div>
                  <div className="hint">{t.user_email ?? t.user_id} · {timeAgo(t.completed_at ?? t.created_at)} · nothing was charged</div>
                </div>
                <button className="reb-btn ghost sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); copy(t.user_email ?? t.user_id); }}>
                  Copy email
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="reb-card">
        <SecHead icon="dollar" title="Transactions" />

        <div className="field-wrap" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <label className="sr-only" htmlFor="tx-search">Search payments</label>
          <input
            id="tx-search"
            className="reb-input"
            placeholder="Search learner, reference or product…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: "1 1 240px" }}
          />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={"reb-btn sm" + (filter === f.key ? " on" : " ghost")}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label} {counts[f.key]}
            </button>
          ))}
        </div>

        {loading && <SkList rows={5} />}
        {error && !loading && <Err msg={error} onRetry={reload} />}

        {!loading && !error && !rows.length && (
          <Emp
            icon="dollar"
            title="No payments yet"
            note="Every checkout will appear here the moment a learner pays — the payment is already recorded by the server."
          />
        )}

        {!loading && !error && rows.length > 0 && !filtered.length && (
          <Emp icon="search" title="Nothing matches that" note="Try a different search or switch the filter back to All." />
        )}

        {!loading && !error && filtered.length > 0 && (
          <div style={{ overflowX: "auto", maxWidth: "100%" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Learner</th>
                  <th scope="col">Product</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: "right" }}>Amount</th>
                  <th scope="col" style={{ textAlign: "right" }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="trow" onClick={() => setSelectedId(t.id)} style={{ cursor: "pointer" }}>
                    <td>{shortDateTime(t.completed_at ?? t.created_at)}</td>
                    <td>{t.user_email ?? t.user_id}</td>
                    <td>{t.product_type ?? "—"}</td>
                    <td className="hint">{t.flutterwave_ref ?? "—"}</td>
                    <td><Badge tone={tone(t.status)}>{title(t.status)}</Badge></td>
                    <td style={{ textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>
                      {money(t.amount_kobo, t.currency ?? "NGN")}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="reb-btn ghost sm"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(t.id); }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* receipt — a side panel rather than a pop-up, so it works at every width */}
      {selected && (
        <div className="reb-card" style={{ marginTop: 14 }}>
          <SecHead
            icon="check"
            title="Receipt"
            right={
              <button className="reb-btn ghost sm" onClick={() => setSelectedId(null)}>
                Close
              </button>
            }
          />
          <div className="grid2">
            <div className="qa">
              <Kv k="Status"><Badge tone={tone(selected.status)}>{title(selected.status)}</Badge></Kv>
              <Kv k="Learner">{selected.user_email ?? selected.user_id}</Kv>
              <Kv k="Product">{selected.product_type ?? "—"}</Kv>
              <Kv k="Amount">{money(selected.amount_kobo, selected.currency ?? "NGN")}</Kv>
              <Kv k="Reference">{selected.flutterwave_ref ?? "no provider reference yet"}</Kv>
              <Kv k="Started">{shortDateTime(selected.created_at)}</Kv>
              <Kv k="Confirmed">{selected.completed_at ? shortDateTime(selected.completed_at) : "not confirmed"}</Kv>
            </div>
            <div className="qa">
              <div className="hint" style={{ marginBottom: 8 }}>
                {selected.status === "successful"
                  ? "Confirmed against the provider, the learner is enrolled and a receipt can be sent."
                  : selected.status === "pending"
                  ? "The provider has not confirmed this yet. Nothing is charged twice — it resolves on its own or can be checked again."
                  : selected.status === "failed"
                  ? "Nothing was charged. The learner can safely try again with a new checkout."
                  : "This record has no final status yet."}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="reb-btn sm"
                  onClick={() =>
                    downloadCsv("receipt-" + (selected.flutterwave_ref ?? selected.id) + ".csv", [
                      ["FerixCourse receipt"],
                      ["Learner", selected.user_email ?? selected.user_id],
                      ["Product", selected.product_type ?? ""],
                      ["Amount", money(selected.amount_kobo, selected.currency ?? "NGN")],
                      ["Reference", selected.flutterwave_ref ?? ""],
                      ["Status", selected.status ?? ""],
                      ["Date", shortDateTime(selected.completed_at ?? selected.created_at)],
                    ])
                  }
                >
                  <Ic name="download" size={15} /> Download receipt
                </button>
                <button className="reb-btn ghost sm" onClick={() => copy(selected.flutterwave_ref ?? selected.id)}>
                  <Ic name="clipboard" size={15} /> Copy reference
                </button>
                <button className="reb-btn ghost sm" onClick={() => copy(selected.user_email ?? selected.user_id)}>
                  <Ic name="clipboard" size={15} /> Copy learner email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
