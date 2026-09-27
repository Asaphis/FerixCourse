"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { apiFetch, money } from "@/lib/dashboard-api";

/*
  Payment result. Confirmed against the transaction record on the server — the
  browser is never trusted. Polling window and behaviour are unchanged from the
  original implementation; only the presentation moved to the dashboard design.
*/

type TxLike = {
  amount_kobo: number;
  currency: string;
  product_type: string;
  flutterwave_ref: string | null;
  status: string;
};

type State = "loading" | "ok" | "pending" | "failed" | "error";

export default function PaymentCallbackPage() {
  const [state, setState] = useState<State>("loading");
  const [tx, setTx] = useState<TxLike | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("tx");
    if (!id) {
      setState("error");
      return;
    }
    let tries = 0;
    const poll = async () => {
      tries++;
      try {
        const r = await apiFetch<{ transaction: TxLike; enrolled?: boolean }>(`/payments/status/${id}`);
        setTx(r.transaction);
        if (r.transaction.status === "successful" || r.enrolled) {
          setState("ok");
          return;
        }
        if (r.transaction.status === "failed" || r.transaction.status === "cancelled") {
          setState("failed");
          return;
        }
        if (tries < 10) setTimeout(poll, 3000);
        else setState("pending");
      } catch {
        setState(tries < 10 ? "pending" : "error");
        if (tries < 10) setTimeout(poll, 3000);
      }
    };
    void poll();
  }, []);

  const icon =
    state === "ok" ? "checkCircle" : state === "failed" ? "circleSlash" : state === "pending" ? "clock" : "loader";

  return (
    <>
      <PageHead title="Payment result" sub="Verified against the transaction record — never the browser." />

      <div className="fc-card" style={{ maxWidth: 560, textAlign: "center", padding: 36 }}>
        <span
          className="fc-empty-ico"
          style={{
            margin: "0 auto 16px",
            ...(state === "ok"
              ? { background: "var(--fc-ok-bg)", color: "var(--fc-ok-fg)", borderColor: "transparent" }
              : state === "failed"
                ? { background: "var(--fc-danger-bg)", color: "var(--fc-danger-fg)", borderColor: "transparent" }
                : state === "pending"
                  ? { background: "var(--fc-warn-bg)", color: "var(--fc-warn-fg)", borderColor: "transparent" }
                  : undefined),
          }}
          aria-hidden="true"
        >
          <Icon name={icon} size={22} style={state === "loading" ? { animation: "fcSpin 0.8s linear infinite" } : undefined} />
        </span>

        {state === "loading" && (
          <>
            <h2 style={{ fontSize: 19 }}>Confirming your payment…</h2>
            <p style={{ fontSize: 13.5, color: "var(--fc-muted)", marginTop: 6 }}>This usually takes a few seconds.</p>
          </>
        )}

        {state === "ok" && (
          <>
            <h2 style={{ fontSize: 19 }}>Payment confirmed</h2>
            {tx && (
              <p style={{ fontSize: 13.5, color: "var(--fc-muted)", marginTop: 6 }}>
                {money(tx.amount_kobo, tx.currency)} · {tx.product_type}
                {tx.flutterwave_ref ? ` · ref ${tx.flutterwave_ref}` : ""}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
              <Link href="/my-courses" className="fc-btn fc-btn-primary">
                My Courses
              </Link>
              <Link href="/classes" className="fc-btn fc-btn-ghost">
                My Classrooms
              </Link>
            </div>
          </>
        )}

        {state === "pending" && (
          <>
            <h2 style={{ fontSize: 19 }}>Still confirming</h2>
            <p style={{ fontSize: 13.5, color: "var(--fc-muted)", marginTop: 6 }}>
              The provider has not confirmed yet. Your receipt will appear under Transactions the moment it lands.
            </p>
            <Link href="/transactions" className="fc-btn fc-btn-ghost" style={{ marginTop: 22 }}>
              View transactions
            </Link>
          </>
        )}

        {state === "failed" && (
          <>
            <h2 style={{ fontSize: 19 }}>Payment did not complete</h2>
            <p style={{ fontSize: 13.5, color: "var(--fc-muted)", marginTop: 6 }}>
              No access was granted and nothing was charged on our side. You can try again.
            </p>
            <Link href="/learn" className="fc-btn fc-btn-primary" style={{ marginTop: 22 }}>
              Back to catalog
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <h2 style={{ fontSize: 19 }}>Could not verify this payment</h2>
            <p style={{ fontSize: 13.5, color: "var(--fc-muted)", marginTop: 6 }}>
              Check your Transactions list or message support — nothing is lost.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
              <Link href="/transactions" className="fc-btn fc-btn-ghost">
                Transactions
              </Link>
              <Link href="/messages" className="fc-btn fc-btn-ghost">
                Contact support
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
