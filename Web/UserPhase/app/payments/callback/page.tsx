"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/dashboard/shell";
import { Icon } from "@/components/ui/icons";
import { apiFetch, money } from "@/lib/dashboard-api";

/*
  Payment result. Confirmed against the transaction record on the server — the
  browser is never trusted. Polling window and behaviour are unchanged from the
  original implementation; presentation is on the rebuild design (card / btn /
  token colors).
*/

type TxLike = {
  amount_kobo: number;
  currency: string;
  product_type: string;
  flutterwave_ref: string | null;
  status: string;
};

type State = "loading" | "ok" | "pending" | "failed" | "error";

const STATE_TONE: Record<State, { bg: string; fg: string }> = {
  loading: { bg: "var(--surface2)", fg: "var(--muted)" },
  ok: { bg: "rgba(52, 211, 153, 0.09)", fg: "var(--ok)" },
  pending: { bg: "rgba(251, 191, 36, 0.10)", fg: "var(--warn)" },
  failed: { bg: "rgba(248, 113, 113, 0.10)", fg: "var(--danger)" },
  error: { bg: "rgba(248, 113, 113, 0.10)", fg: "var(--danger)" },
};

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
  const tone = STATE_TONE[state];

  return (
    <>
      <PageHead title="Payment result" sub="Verified against the transaction record — never the browser." />

      <div className="card" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: 36 }}>
        <span
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 16px",
            borderRadius: 18,
            display: "grid",
            placeItems: "center",
            background: tone.bg,
            color: tone.fg,
            border: "1px solid var(--border)",
          }}
          aria-hidden="true"
        >
          <Icon
            name={icon}
            size={22}
            style={state === "loading" ? { animation: "rebSpin 0.8s linear infinite" } : undefined}
          />
        </span>

        {state === "loading" && (
          <>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: 19, fontWeight: 800 }}>Confirming your payment…</h2>
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>This usually takes a few seconds.</p>
          </>
        )}

        {state === "ok" && (
          <>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: 19, fontWeight: 800 }}>Payment confirmed</h2>
            {tx && (
              <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
                {money(tx.amount_kobo, tx.currency)} · {tx.product_type}
                {tx.flutterwave_ref ? ` · ref ${tx.flutterwave_ref}` : ""}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
              <Link href="/my-courses" className="btn pri">
                My Courses
              </Link>
              <Link href="/classes" className="btn ghost">
                My Classrooms
              </Link>
            </div>
          </>
        )}

        {state === "pending" && (
          <>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: 19, fontWeight: 800 }}>Still confirming</h2>
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
              The provider has not confirmed yet. Your receipt will appear under Transactions the moment it lands.
            </p>
            <Link href="/transactions" className="btn ghost" style={{ marginTop: 22 }}>
              View transactions
            </Link>
          </>
        )}

        {state === "failed" && (
          <>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: 19, fontWeight: 800 }}>Payment did not complete</h2>
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
              No access was granted and nothing was charged on our side. You can try again.
            </p>
            <Link href="/catalog" className="btn pri" style={{ marginTop: 22 }}>
              Back to catalog
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: 19, fontWeight: 800 }}>Could not verify this payment</h2>
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
              Check your Transactions list or message support — nothing is lost.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
              <Link href="/transactions" className="btn ghost">
                Transactions
              </Link>
              <Link href="/messages" className="btn ghost">
                Contact support
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
