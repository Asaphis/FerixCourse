"use client";
import { useMemo, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { Chip, EmptyState, LoadingGrid, StatCard, StatusBadge, shortDateTime } from "@/components/ui/primitives";
import { money } from "@/lib/dashboard-api";

/*
  Transactions — a real table over GET /api/transactions/mine, with status
  filters and totals summed from the returned rows.
*/

type Filter = "all" | "successful" | "pending" | "failed";

export default function TransactionsPage() {
  const { data, loading, failures, reload } = useDashboard();
  const [filter, setFilter] = useState<Filter>("all");
  const tx = data?.transactions ?? [];

  const totals = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let failed = 0;
    let currency = "NGN";
    for (const t of tx) {
      currency = t.currency || currency;
      if (t.status === "successful") paid += t.amount_kobo;
      else if (t.status === "pending") pending += t.amount_kobo;
      else failed += t.amount_kobo;
    }
    return { paid, pending, failed, currency };
  }, [tx]);

  const visible = useMemo(() => (filter === "all" ? tx : tx.filter((t) => t.status === filter)), [tx, filter]);

  return (
    <>
      <PageHead title="Transactions" sub="Every payment attempt on your account, with its provider reference." />

      {failures.length > 0 && (
        <div className="fc-alert fc-alert-danger" role="alert">
          <Icon name="alertCircle" size={17} />
          <span style={{ flex: 1 }}>Could not load transactions. Billing was not affected.</span>
          <button type="button" className="fc-btn fc-btn-sm fc-btn-ghost" onClick={reload}>
            <Icon name="refresh" size={14} /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <LoadingGrid height={86} count={3} />
      ) : (
        <div className="fc-stats" style={{ marginBottom: 24 }}>
          <StatCard icon="wallet" tone="ok" label="Total paid" value={money(totals.paid, totals.currency)} />
          <StatCard icon="clock" tone="warn" label="Awaiting confirmation" value={money(totals.pending, totals.currency)} />
          <StatCard icon="circleSlash" label="Failed" value={money(totals.failed, totals.currency)} />
        </div>
      )}

      {!loading && tx.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="No transactions yet"
          body="Payments you make will appear here with their receipt reference."
        />
      ) : !loading ? (
        <>
          <div className="fc-filter-bar">
            <Chip pressed={filter === "all"} onClick={() => setFilter("all")}>
              All ({tx.length})
            </Chip>
            <Chip pressed={filter === "successful"} onClick={() => setFilter("successful")}>
              Paid ({tx.filter((t) => t.status === "successful").length})
            </Chip>
            <Chip pressed={filter === "pending"} onClick={() => setFilter("pending")}>
              Pending ({tx.filter((t) => t.status === "pending").length})
            </Chip>
            <Chip pressed={filter === "failed"} onClick={() => setFilter("failed")}>
              Failed ({tx.filter((t) => t.status === "failed").length})
            </Chip>
          </div>

          {visible.length === 0 ? (
            <EmptyState icon="filter" title="Nothing in this filter" body="Choose another status to see the rest." />
          ) : (
            <div className="fc-table-wrap">
              <table className="fc-tbl">
                <caption className="fc-sr-only">Your transactions, newest first</caption>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Provider reference</th>
                    <th scope="col">Date</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600, textTransform: "capitalize" }}>{t.product_type}</td>
                      <td>
                        <code>{t.flutterwave_ref ?? "—"}</code>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{shortDateTime(t.created_at)}</td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="num" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                        {money(t.amount_kobo, t.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </>
  );
}
