import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Users, BarChart3, Clock, Check } from "lucide-react";
import { Navbar, Footer } from "@/components/site";
import { Section, Eyebrow, Reveal } from "@/components/fx";
import EnrollButton from "@/components/enroll";
import { getClassroom, formatMoney } from "@/lib/api";

export default async function ClassroomPage({ params }: { params: { slug: string } }) {
  const c = await getClassroom(params.slug);
  if (!c) notFound();
  const seatsLeft = Math.max(0, c.capacity - (c.enrolled ?? 0));

  return (
    <main className="min-h-screen bg-stone-950">
      <Navbar />
      <Section variant="scatter">
        <div className="grid gap-10 pt-24 lg:grid-cols-[1.4fr_.8fr]">
          <div>
            <Reveal><Eyebrow>Live cohort · {c.level}</Eyebrow></Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">{c.title}</h1>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-5 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-slate-400">{c.description || "Full syllabus announced by the instructor."}</p>
            </Reveal>
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2"><CalendarDays size={15} className="text-rose-300" /> {c.schedule_text || "Scheduled"}</span>
              <span className="inline-flex items-center gap-2"><Users size={15} className="text-rose-300" /> {c.enrolled ?? 0}/{c.capacity} enrolled</span>
              <span className="inline-flex items-center gap-2"><BarChart3 size={15} className="text-rose-300" /> {c.level}</span>
              {c.starts_at && <span className="inline-flex items-center gap-2"><Clock size={15} className="text-rose-300" /> Starts {new Date(c.starts_at).toLocaleDateString()}</span>}
            </div>
            <Reveal delay={0.1}>
              <h2 className="mt-10 font-display text-xl font-bold">Sessions {(c.sessions ?? []).length > 0 && <span className="text-slate-500">({c.sessions.length})</span>}</h2>
              {(c.sessions ?? []).length === 0 ? (
                <p className="mt-3 rounded-2xl border border-white/10 p-5 text-sm text-slate-500">Session schedule publishes before the cohort starts. Enrolled students get notified.</p>
              ) : (
                <div className="mt-4 grid gap-2.5">
                  {c.sessions.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm">
                      <Check size={14} className="text-emerald-300" /><span className="font-semibold">{s.title}</span>
                      <span className="ml-auto text-xs text-slate-500">{s.starts_at ? new Date(s.starts_at).toLocaleDateString() : ""} · {s.recording_status}</span>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>
            {(c.materials ?? []).length > 0 && (
              <>
                <h2 className="mt-8 font-display text-xl font-bold">Included materials</h2>
                <div className="mt-4 grid gap-2.5">
                  {c.materials.map((m: any) => (
                    <p key={m.id} className="rounded-2xl border border-white/10 px-4 py-3 text-sm">{m.title} <span className="text-xs text-slate-500">· {m.mime}</span></p>
                  ))}
                </div>
              </>
            )}
          </div>
          <Reveal delay={0.15}>
            <div className="h-fit rounded-[28px] border border-white/12 bg-stone-900/85 p-7 backdrop-blur lg:sticky lg:top-28">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Cohort access</p>
              <p className="mt-2 font-display text-4xl font-bold">{formatMoney(c.price_kobo, c.currency)}</p>
              <p className="mt-1.5 text-[13px] text-slate-400">{seatsLeft} of {c.capacity} seats left</p>
              <div className="mt-6">
                <EnrollButton productType="classroom" productId={c.id} priceKobo={c.price_kobo} currency={c.currency} />
              </div>
              <ul className="mt-6 space-y-2 text-[13px] text-slate-400">
                {["Live HD sessions + chat", "Automatic recordings kept", "Verified secure payment", "Direct instructor access"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check size={13} className="text-emerald-300" /> {t}</li>
                ))}
              </ul>
              <p className="mt-5 text-center text-[12.5px] text-slate-500">Not the right fit? <Link href="/request" className="font-bold text-slate-300 hover:text-white">Request custom training</Link></p>
            </div>
          </Reveal>
        </div>
      </Section>
      <Footer />
    </main>
  );
}
