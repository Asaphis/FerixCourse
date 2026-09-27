"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [fee, setFee] = useState({ enabled: false, amount_kobo: 0, currency: "NGN", description: "" });
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    adminFetch("/admin/settings").then((s) => {
      setSettings(s);
      const f = s.find((x: any) => x.key === "registration_fee");
      /* The stored value round-trips as JSON, so it can arrive as a string.
         Assigning that string straight into `fee` replaced the whole object, so
         every field became undefined — React warned that a controlled input had
         turned uncontrolled and the inputs rendered blank, and the next save
         wrote the string back. Parse it into the object shape instead, and leave
         the defaults alone when the value is not a usable object. */
      if (!f?.value) return;
      try {
        const parsed = typeof f.value === "string" ? JSON.parse(f.value) : f.value;
        if (parsed && typeof parsed === "object") setFee((prev) => ({ ...prev, ...parsed }));
      } catch {
        /* Legacy non-JSON value — keep the defaults rather than break the form. */
      }
    }).catch((e) => setErr(e.message));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await adminFetch("/admin/settings/registration_fee", { method: "PUT", body: JSON.stringify({ value: fee }) });
      setMsg("Registration fee saved.");
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      {msg && <p className="card mt-4 text-sm text-emerald-200">{msg}</p>}

      <form onSubmit={save} className="card mt-5 grid sm:grid-cols-2 gap-3 max-w-2xl">
        <h2 className="font-semibold sm:col-span-2">Registration fee</h2>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={fee.enabled} onChange={(e) => setFee({ ...fee, enabled: e.target.checked })} /> Enabled
        </label>
        <input value={fee.amount_kobo} onChange={(e) => setFee({ ...fee, amount_kobo: Number(e.target.value) })} type="number" min={0} placeholder="Amount (kobo)" className="input" />
        <input value={fee.currency} onChange={(e) => setFee({ ...fee, currency: e.target.value })} placeholder="NGN" className="input" />
        <input value={fee.description} onChange={(e) => setFee({ ...fee, description: e.target.value })} placeholder="Description" className="input sm:col-span-2" />
        <button className="btn sm:col-span-2">Save</button>
      </form>

      <div className="card mt-5 max-w-2xl">
        <h2 className="font-semibold text-sm">All settings ({settings.length})</h2>
        {settings.map((s) => (
          <p key={s.key} className="text-xs text-slate-400 mt-1 font-mono">{s.key}</p>
        ))}
      </div>
    </Shell>
  );
}
