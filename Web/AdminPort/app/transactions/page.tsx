"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

export default function TransactionsPage() {
  const [tx, setTx] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminFetch("/admin/transactions").then(setTx).catch((e) => setErr(e.message));
  }, []);

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Payments & Transactions</h1>
      <p className="text-sm text-slate-400 mt-1">Flutterwave references retained per transaction.</p>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      <div className="mt-4 grid gap-3">
        {tx.map((t) => (
          <div key={t.id} className="card flex flex-wrap items-center gap-2 text-sm">
            <div>
              <p className="font-semibold">{(t.amount_kobo / 100).toLocaleString()} {t.currency} <span className="text-xs text-slate-400">• {t.product_type}</span></p>
              <p className="text-xs text-slate-400">{t.user_email ?? t.user_id} • {t.flutterwave_ref ?? "no provider ref yet"}</p>
            </div>
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-white/10">{t.status}</span>
          </div>
        ))}
        {!tx.length && !err && <p className="card text-sm text-slate-400">No transactions yet.</p>}
      </div>
    </Shell>
  );
}
