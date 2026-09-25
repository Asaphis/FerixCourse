"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/shell";
import { apiFetch } from "@/lib/client";
import { formatMoney } from "@/lib/api";

export default function TransactionsPage() {
  const [tx, setTx] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiFetch("/transactions/mine").then(setTx).catch((e) => setErr(e.message));
  }, []);

  return (
    <AppShell title="Transactions" sub="Every payment attempt, with provider references.">
      {err && <p className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{err}</p>}
      <div className="grid max-w-3xl gap-2.5">
        {tx.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-night-900/70 px-4 py-3.5 text-sm">
            <div>
              <p className="font-bold">{formatMoney(t.amount_kobo, t.currency)} <span className="font-normal text-slate-400">· {t.product_type}</span></p>
              <p className="mt-0.5 font-mono text-[11.5px] text-slate-500">{t.flutterwave_ref ?? "no provider ref"} · {new Date(t.created_at).toLocaleString()}</p>
            </div>
            <span className="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold">{t.status}</span>
          </div>
        ))}
        {!tx.length && !err && (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <p className="font-display font-bold">No transactions yet.</p>
            <p className="mt-1 text-sm text-slate-400">Payments you make will appear here with receipts.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
