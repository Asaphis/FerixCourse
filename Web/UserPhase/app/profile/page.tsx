"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/shell";
import { currentUser, apiFetch } from "@/lib/client";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tx, setTx] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const u = await currentUser().catch(() => null);
      if (!u) return router.push("/login");
      setEmail(u.email ?? "");
      setName(String(u.user_metadata?.full_name ?? ""));
      apiFetch("/transactions/mine").then(setTx).catch(() => {});
    })();
  }, [router]);

  async function logout() {
    await supabase().auth.signOut();
    router.push("/");
  }

  return (
    <AppShell title="Profile" sub="Your account and recent activity.">
      <div className="grid max-w-3xl gap-3">
        <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-stone-900/70 p-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-amber-400 font-display text-xl font-bold">
            {(name || email).charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="font-display text-lg font-bold">{name || "Learner"}</p>
            <p className="text-sm text-slate-400">{email}</p>
          </div>
          <button onClick={logout} className="ml-auto rounded-xl border border-white/15 px-4 py-2 text-[13px] font-bold hover:bg-white/5">Log out</button>
        </div>
        <div className="rounded-3xl border border-white/10 bg-stone-900/70 p-6">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-slate-500">Recent payments</p>
          {tx.slice(0, 5).map((t) => (
            <div key={t.id} className="mt-2.5 flex items-center justify-between rounded-xl bg-black/30 px-4 py-2.5 text-sm">
              <span>{t.product_type} · {formatMoney(t.amount_kobo, t.currency)}</span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px]">{t.status}</span>
            </div>
          ))}
          {!tx.length && <p className="mt-2.5 text-sm text-slate-500">No payments yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
