"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminFetch } from "@/lib/admin";

export default function ManageClassroomPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [room, setRoom] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [mats, setMats] = useState<any>({ classroom: [], courses: [] });
  const [assign, setAssign] = useState<any[]>([]);
  const [subs, setSubs] = useState<Record<string, any[]>>({});
  const [fb, setFb] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [sessF, setSessF] = useState({ title: "", starts_at: "", ends_at: "" });
  const [matF, setMatF] = useState({ title: "", storage_key: "", mime: "" });
  const [annF, setAnnF] = useState({ title: "", body: "" });
  const [asF, setAsF] = useState({ title: "", description: "", due_at: "" });

  async function load() {
    try {
      const [rooms, s, m, a] = await Promise.all([
        adminFetch("/admin/classrooms"),
        adminFetch(`/admin/sessions?classroom_id=${id}`),
        adminFetch("/admin/materials"),
        adminFetch(`/admin/assignments?classroom_id=${id}`).catch(() => []),
      ]);
      setRoom((rooms as any[]).find((r) => r.id === id) ?? null);
      setSessions(s);
      setMats(m);
      setAssign(a);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function wrap(fn: () => Promise<any>, okMsg: string) {
    setErr(""); setMsg("");
    try {
      await fn();
      setMsg(okMsg);
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  const myMats = (mats.classroom ?? []).filter((m: any) => m.classroom_id === id);

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">{room?.title ?? "Classroom"}</h1>
      <p className="text-sm text-slate-400 mt-1">Full control: sessions, live, materials, announcements, assignments.</p>
      {err && <p className="card mt-4 text-sm text-rose-200">{err}</p>}
      {msg && <p className="card mt-4 text-sm text-emerald-200">{msg}</p>}

      <div className="card mt-5">
        <h2 className="font-semibold">Sessions — pick what trains, start live</h2>
        <form onSubmit={(e) => { e.preventDefault(); wrap(() => adminFetch("/admin/sessions", { method: "POST", body: JSON.stringify({ classroom_id: id, ...sessF }) }), "Session created."); }}
          className="mt-3 grid sm:grid-cols-4 gap-2">
          <input value={sessF.title} onChange={(e) => setSessF({ ...sessF, title: e.target.value })} required placeholder="Session title" className="input" />
          <input value={sessF.starts_at} onChange={(e) => setSessF({ ...sessF, starts_at: e.target.value })} type="datetime-local" className="input" />
          <input value={sessF.ends_at} onChange={(e) => setSessF({ ...sessF, ends_at: e.target.value })} type="datetime-local" className="input" />
          <button className="btn">Add session</button>
        </form>
        <div className="mt-3 grid gap-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-black/30 px-3.5 py-2.5 text-sm">
              <span className="font-semibold">{s.title}</span>
              <span className="text-xs text-slate-500">{s.starts_at ? new Date(s.starts_at).toLocaleString() : "TBD"} · {s.status}</span>
              <span className="ml-auto flex gap-1.5">
                {s.status !== "live" && <button onClick={() => wrap(() => adminFetch(`/admin/sessions/${s.id}`, { method: "PATCH", body: JSON.stringify({ status: "live" }) }), "Live started — members notified.")} className="btn text-xs !px-3 !py-1.5">Start live</button>}
                {s.status === "live" && <button onClick={() => wrap(() => adminFetch(`/admin/sessions/${s.id}`, { method: "PATCH", body: JSON.stringify({ status: "ended" }) }), "Session ended.")} className="btn-ghost text-xs">End</button>}
              </span>
            </div>
          ))}
          {!sessions.length && <p className="text-sm text-slate-500">No sessions scheduled.</p>}
        </div>
      </div>

      <div className="card mt-4">
        <h2 className="font-semibold">Materials — upload destination is this classroom</h2>
        <form onSubmit={(e) => { e.preventDefault(); wrap(() => adminFetch("/admin/materials", { method: "POST", body: JSON.stringify({ classroom_id: id, ...matF }) }), "Material recorded for this classroom only."); }}
          className="mt-3 grid sm:grid-cols-4 gap-2">
          <input value={matF.title} onChange={(e) => setMatF({ ...matF, title: e.target.value })} required placeholder="Title" className="input" />
          <input value={matF.storage_key} onChange={(e) => setMatF({ ...matF, storage_key: e.target.value })} required placeholder="storage key (R2 path)" className="input" />
          <input value={matF.mime} onChange={(e) => setMatF({ ...matF, mime: e.target.value })} placeholder="mime" className="input" />
          <button className="btn">Save to classroom</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">File bytes upload straight to private R2 once the bucket is set — this record controls who may open it (members only).</p>
        <div className="mt-3 grid gap-2">
          {myMats.map((m: any) => (
            <div key={m.id} className="flex items-center gap-2 rounded-xl bg-black/30 px-3.5 py-2.5 text-sm">
              <span className="font-semibold">{m.title}</span>
              <button onClick={() => wrap(() => adminFetch(`/admin/materials/classroom/${m.id}/notify`, { method: "POST" }), "Members notified.")} className="btn-ghost ml-auto text-xs">Notify members</button>
            </div>
          ))}
          {!myMats.length && <p className="text-sm text-slate-500">No materials in this classroom.</p>}
        </div>
      </div>

      <div className="card mt-4">
        <h2 className="font-semibold">Announcements — members only</h2>
        <form onSubmit={(e) => { e.preventDefault(); wrap(() => adminFetch("/admin/announcements", { method: "POST", body: JSON.stringify({ classroom_id: id, ...annF }) }), "Announcement posted + members notified."); setAnnF({ title: "", body: "" }); }}
          className="mt-3 grid gap-2">
          <input value={annF.title} onChange={(e) => setAnnF({ ...annF, title: e.target.value })} required placeholder="Title" className="input" />
          <textarea value={annF.body} onChange={(e) => setAnnF({ ...annF, body: e.target.value })} rows={2} placeholder="Message to members…" className="input" />
          <button className="btn w-fit">Post announcement</button>
        </form>
      </div>

      <div className="card mt-4">
        <h2 className="font-semibold">Assignments + submissions + feedback</h2>
        <form onSubmit={(e) => { e.preventDefault(); wrap(() => adminFetch("/admin/assignments", { method: "POST", body: JSON.stringify({ classroom_id: id, ...asF }) }), "Assignment created."); setAsF({ title: "", description: "", due_at: "" }); }}
          className="mt-3 grid sm:grid-cols-4 gap-2">
          <input value={asF.title} onChange={(e) => setAsF({ ...asF, title: e.target.value })} required placeholder="Title" className="input" />
          <input value={asF.description} onChange={(e) => setAsF({ ...asF, description: e.target.value })} placeholder="Instructions" className="input" />
          <input value={asF.due_at} onChange={(e) => setAsF({ ...asF, due_at: e.target.value })} type="datetime-local" className="input" />
          <button className="btn">Create</button>
        </form>
        <div className="mt-3 grid gap-2">
          {assign.map((a) => (
            <div key={a.id} className="rounded-xl bg-black/30 px-3.5 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{a.title}</span>
                <span className="text-xs text-slate-500">{a.submissions} submission{(a.submissions ?? 0) === 1 ? "" : "s"}</span>
                <button onClick={async () => {
                  try {
                    const rows = await adminFetch(`/admin/assignments/${a.id}/submissions`);
                    setSubs((p) => ({ ...p, [a.id]: rows }));
                  } catch (e: any) { setErr(e.message); }
                }} className="btn-ghost ml-auto text-xs">Review</button>
              </div>
              {(subs[a.id] ?? []).map((s: any) => (
                <div key={s.user_id} className="mt-2 rounded-lg bg-white/[.04] p-3 text-sm">
                  <p className="text-xs text-slate-400">{s.full_name ?? s.email}</p>
                  <p className="mt-1 whitespace-pre-line">{s.body || "(no text)"}</p>
                  {s.feedback && <p className="mt-1 text-[13px] text-emerald-200">Feedback sent: {s.feedback}</p>}
                  <div className="mt-2 flex gap-2">
                    <input value={fb[`${a.id}:${s.user_id}`] ?? s.feedback ?? ""} onChange={(e) => setFb({ ...fb, [`${a.id}:${s.user_id}`]: e.target.value })}
                      placeholder="Write feedback…" className="input" />
                    <button onClick={() => wrap(
                      () => adminFetch(`/admin/submissions/${s.user_id}/${a.id}`, { method: "PATCH", body: JSON.stringify({ feedback: fb[`${a.id}:${s.user_id}`] ?? "" }) }),
                      "Feedback sent + student notified."
                    )} className="btn text-xs">Send</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {!assign.length && <p className="text-sm text-slate-500">No assignments in this classroom.</p>}
        </div>
      </div>
    </Shell>
  );
}
