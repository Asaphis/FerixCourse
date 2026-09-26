"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import AppShell from "@/components/shell";
import { apiFetch } from "@/lib/client";
import { formatMoney } from "@/lib/api";

export default function PaymentCallbackPage() {
  const [state, setState] = useState<"loading" | "ok" | "pending" | "failed" | "error">("loading");
  const [tx, setTx] = useState<any>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("tx");
    if (!id) { setState("error"); return; }
    let tries = 0;
    const poll = async () => {
      tries++;
      try {
        const r = await apiFetch(`/payments/status/${id}`);
        setTx(r.transaction);
        if (r.transaction.status === "successful" || r.enrolled) { setState("ok"); return; }
        if (r.transaction.status === "failed" || r.transaction.status === "cancelled") { setState("failed"); return; }
        if (tries < 10) setTimeout(poll, 3000);
        else setState("pending");
      } catch {
        setState(tries < 10 ? "pending" : "error");
        if (tries < 10) setTimeout(poll, 3000);
      }
    };
    poll();
  }, []);

  return (
    <AppShell title="Payment result" sub="Verified against the transaction record — never the browser.">
      <div className="max-w-lg rounded-3xl border border-white/10 bg-stone-900/70 p-8 text-center">
        {state === "loading" && <p className="text-sm text-slate-400">Confirming your payment…</p>}
        {state === "ok" && (
          <>
            <CheckCircle2 size={40} className="mx-auto text-emerald-300" />
            <h2 className="mt-4 font-display text-xl font-bold">Payment confirmed</h2>
            {tx && <p className="mt-2 text-sm text-slate-400">{formatMoney(tx.amount_kobo, tx.currency)} · {tx.product_type} · ref {tx.flutterwave_ref}</p>}
            <div className="mt-6 flex justify-center gap-2.5">
              <Link href="/my-courses" className="btn-aurora rounded-xl px-5 py-2.5 text-sm font-bold text-white">My Courses</Link>
              <Link href="/classes" className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-bold hover:bg-white/5">My Classrooms</Link>
            </div>
          </>
        )}
        {state === "pending" && (
          <>
            <Clock size={40} className="mx-auto text-amber-300" />
            <h2 className="mt-4 font-display text-xl font-bold">Still confirming</h2>
            <p className="mt-2 text-sm text-slate-400">The provider has not confirmed yet. Your receipt will appear under Transactions the moment it lands.</p>
            <Link href="/transactions" className="mt-6 inline-block rounded-xl border border-white/15 px-5 py-2.5 text-sm font-bold hover:bg-white/5">View transactions</Link>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircle size={40} className="mx-auto text-rose-300" />
            <h2 className="mt-4 font-display text-xl font-bold">Payment did not complete</h2>
            <p className="mt-2 text-sm text-slate-400">No access was granted and nothing was charged on our side. Try again.</p>
            <Link href="/learn" className="mt-6 inline-block rounded-xl border border-white/15 px-5 py-2.5 text-sm font-bold hover:bg-white/5">Back to catalog</Link>
          </>
        )}
        {state === "error" && <p className="text-sm text-slate-400">Could not verify this payment. Check Transactions or contact support.</p>}
      </div>
    </AppShell>
  );
}
