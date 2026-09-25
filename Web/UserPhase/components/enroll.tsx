"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { apiFetch, currentUser } from "@/lib/client";
import { formatMoney } from "@/lib/api";

export default function EnrollButton({ productType, productId, priceKobo, currency }: {
  productType: "classroom" | "course"; productId: string; priceKobo: number; currency: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function enroll() {
    setMsg("");
    const u = await currentUser().catch(() => null);
    if (!u) return router.push("/login");
    setBusy(true);
    try {
      const r = await apiFetch("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ product_type: productType, product_id: productId }),
      });
      if (r.already_enrolled) return router.push("/dashboard");
      if (r.enrolled) {
        setDone(true);
        setMsg("Enrolled — free program. See it on your dashboard.");
        return;
      }
      setMsg(r.message ?? "Reservation recorded.");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={enroll} disabled={busy || done} className="btn-aurora flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold text-white disabled:opacity-50">
        <Lock size={15} /> {busy ? "Processing…" : done ? "Enrolled" : `Enroll — ${formatMoney(priceKobo, currency)}`}
      </button>
      {msg && <p className="mt-3 rounded-xl border border-white/12 bg-white/[.04] px-3.5 py-2.5 text-[13px] text-slate-300">{msg}</p>}
    </div>
  );
}
