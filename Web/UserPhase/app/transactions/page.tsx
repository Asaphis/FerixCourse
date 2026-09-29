"use client";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { shortDateTime } from "@/components/ui/primitives";
import { money } from "@/lib/dashboard-api";

/*
  Transactions — real rows from GET /public/transactions/mine. Amounts are in
  kobo (minor units); the helper converts to a currency string. A pending
  payment says so rather than counting as revenue.
*/

const STATUS_TONE: Record<string, string> = {
  successful: "ok",
  pending: "warn",
  failed: "danger",
  cancelled: "neutral",
};

export default function TransactionsPage() {
  const { data, loading } = useDashboard();
  const rows = data?.transactions ?? [];
  const total = rows.filter((t) => t.status === "successful").reduce((n, t) => n + (Number(t.amount_kobo) || 0), 0);

  return (
    <>
      <PageHead
        title="Transactions"
        sub="Every payment on your account, newest first."
        actions={
          total > 0 ? (
            <span className="badge" style={{ fontSize: 12 }}>
              Paid: {money(total)}
            </span>
          ) : null
        }
      />

      {loading ? (
        <div className="qa" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="qa"><div className="skel" style={{ height: 40 }} /></div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card empty">
          <div className="ico"><Icon name="receipt" size={24} /></div>
          <h3>No payments yet</h3>
          <p>When you enrol in a course or cohort, the payment and its receipt appear here.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="tbl" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr className="tr" style={{ textAlign: "left" }}>
                <th style={{ padding: "12px 16px" }}>When</th>
                <th style={{ padding: "12px 16px" }}>For</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="trow">
                  <td style={{ padding: "12px 16px" }} className="hint">{shortDateTime(t.completed_at ?? t.created_at)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {t.product_type === "course" ? "Course" : t.product_type === "classroom" ? "Classroom" : t.product_type}
                    {t.flutterwave_ref && <span className="hint" style={{ display: "block" }}>ref {t.flutterwave_ref.slice(0, 12)}…</span>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className="badge" data-tone={STATUS_TONE[t.status] ?? "neutral"}>{t.status}</span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>
                    {money(t.amount_kobo, t.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
