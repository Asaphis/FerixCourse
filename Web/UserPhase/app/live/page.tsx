import Link from "next/link";
import { ArrowRight, CalendarDays, Users, Clock } from "lucide-react";
import { Navbar, Footer, MobileNav } from "@/components/site";
import { Section, Eyebrow, Reveal } from "@/components/fx";
import { LiveTeasers } from "@/components/sections";
import { getClassrooms, formatMoney } from "@/lib/api";

export const metadata = { title: "Live classes — FerixCourse" };

export default async function LivePage() {
  const rooms = await getClassrooms();

  return (
    <main className="min-h-screen bg-stone-950 pb-20 md:pb-0">
      <Navbar />
      <Section variant="dense" word="LIVE">
        <div className="pt-24">
          <Reveal><Eyebrow>Instructor-led cohorts</Eyebrow></Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-black uppercase tracking-[-0.02em] sm:text-6xl sm:leading-[0.95]">
              SHOW UP.<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">level up.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-slate-400">
              Fixed schedules, capped seats, live instructors. Miss a session?
              The recording is waiting for you.
            </p>
          </Reveal>
          <LiveTeasers />
          <Reveal delay={0.05}>
            <h2 className="mt-16 font-display text-2xl font-bold">Open cohorts {rooms.length > 0 && <span className="text-slate-500">({rooms.length})</span>}</h2>
          </Reveal>
          {rooms.length === 0 ? (
            <Reveal>
              <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[.02] p-10 text-center">
                <p className="font-display text-lg font-bold">No open cohorts right now</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">New cohorts open regularly — register and we will notify you.</p>
                <Link href="/register" className="btn-aurora mt-5 inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white">Notify me</Link>
              </div>
            </Reveal>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {rooms.map((r: any, i: number) => (
                <Reveal key={r.id} delay={i * 0.06}>
                  <Link href={`/classrooms/${r.slug}`} className="card-lift block h-full rounded-3xl border border-white/10 bg-stone-900/70 p-7">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{r.level} · Live cohort</p>
                    <h3 className="mt-2.5 font-display text-xl font-bold">{r.title}</h3>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-400">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> {r.schedule_text || "Scheduled"}</span>
                      <span className="inline-flex items-center gap-1.5"><Users size={14} /> {r.enrolled}/{r.capacity} seats</span>
                      {r.starts_at && <span className="inline-flex items-center gap-1.5"><Clock size={14} /> Starts {new Date(r.starts_at).toLocaleDateString()}</span>}
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                      <p className="font-display text-xl font-bold">{formatMoney(r.price_kobo, r.currency)}</p>
                      <span className="group inline-flex items-center gap-1 text-sm font-bold">Details <ArrowRight size={15} /></span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </Section>
      <Footer />
      <MobileNav />
    </main>
  );
}
