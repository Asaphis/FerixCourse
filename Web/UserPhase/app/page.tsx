import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar, Footer, MobileNav } from "@/components/site";
import { Starfield, Section, Eyebrow, Reveal, DriftOrb, AuroraCanvas } from "@/components/fx";
import { Counter, TrackTeasers, MethodTeasers, LiveTeasers, FeaturedGrid, DeskScene } from "@/components/sections";
import { getFeatured, getCourses, getClassrooms } from "@/lib/api";

const SKILLS = ["React", "TypeScript", "Next.js", "Node.js", "PostgreSQL", "REST APIs", "React Native", "Python", "AI Engineering", "DevOps", "Docker", "Git"];

export default async function Home() {
  const [featured, courses, rooms] = await Promise.all([getFeatured(), getCourses(), getClassrooms()]);

  return (
    <main className="min-h-screen bg-stone-950 pb-20 md:pb-0">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <AuroraCanvas variant="hero" />
        <div className="pointer-events-none absolute inset-0 bg-stone-950/45" />
        <Starfield />
        <div className="grain absolute inset-0" />
        <DriftOrb className="left-[8%] top-[20%] h-72 w-72 bg-orange-600/25" from={0} to={-70} />
        <DriftOrb className="right-[5%] top-[55%] h-80 w-80 bg-rose-600/20" from={40} to={-60} />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-36 sm:px-6 sm:pt-44 lg:grid-cols-2">
          <div>
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[.04] px-4 py-2 font-mono text-[12px] text-amber-200 backdrop-blur">
                <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="h-2 w-2 rounded-full bg-emerald-400" /></span>
                {rooms.length > 0 ? `${rooms.length} live cohort${rooms.length === 1 ? "" : "s"} enrolling now` : "> roll_call -- new cohorts forming"}
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-6 font-display text-[13vw] font-black uppercase leading-[0.9] tracking-[-0.02em] sm:text-7xl xl:text-[92px]">
                Stop watching.
                <br /><span className="text-outline">Start building.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-md text-[16px] leading-relaxed text-stone-400">
                Live cohorts with real instructors. Recorded courses you keep.
                Mentors on demand. Join free, pay only when you enroll — and
                leave every program with proof of work.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/learn" className="btn-aurora group inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-bold text-white">
                  Claim your seat <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link href="/method" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[.04] px-7 py-4 text-[15px] font-bold backdrop-blur transition hover:border-white/30 hover:bg-white/[.08]">
                  See how it works
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-stone-300">
                {["Verified payments", "Sessions recorded", "Mentors on demand"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400" />{t}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.18} className="w-full">
            <DeskScene openCohorts={rooms.length} />
          </Reveal>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-6 border-t border-white/10 py-7 sm:grid-cols-4">
              {[
                [courses.length, "Courses live"],
                [rooms.length, "Cohorts open"],
                [4, "Ways to learn"],
                ["Free", "Cost to join"],
              ].map(([v, l]) => (
                <div key={l as string}>
                  <p className="font-display text-[30px] font-black">{typeof v === "number" ? <Counter to={v} /> : v}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">{l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
        <div className="relative overflow-hidden border-y border-white/8 bg-black/30">
          <div className="mask-fade-x flex w-max animate-marquee items-center gap-10 whitespace-nowrap py-4 pr-10">
            {[...SKILLS, ...SKILLS].map((s, i) => (
              <span key={i} className="font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-slate-500">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* TRACKS */}
      <Section variant="dense" word="TRACKS">
        <Reveal><Eyebrow>Four ways in</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-black uppercase tracking-[-0.02em] sm:text-5xl sm:leading-[1.02]">
            Pick your lane.<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">own the road.</span>
          </h2>
        </Reveal>
        <TrackTeasers />
        <Reveal delay={0.1}>
          <p className="mt-8 text-center text-sm text-slate-500">
            Compare all four formats on the <Link href="/tracks" className="font-bold text-white underline decoration-rose-400/60 underline-offset-4 hover:decoration-rose-300">tracks page <ArrowRight size={13} className="inline" /></Link>
          </p>
        </Reveal>
      </Section>

      {/* METHOD */}
      <Section variant="scatter" word="METHOD">
        <Reveal><Eyebrow>How it works</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-black uppercase tracking-[-0.02em] sm:text-5xl sm:leading-[1.02]">
            Zero fluff.<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">all signal.</span>
          </h2>
        </Reveal>
        <MethodTeasers />
        <Reveal delay={0.1}>
          <p className="mt-8 text-center text-sm text-slate-500">
            The complete playbook lives on the <Link href="/method" className="font-bold text-white underline decoration-amber-300/60 underline-offset-4 hover:decoration-amber-200">method page <ArrowRight size={13} className="inline" /></Link>
          </p>
        </Reveal>
      </Section>

      {/* LIVE */}
      <Section variant="dense" word="LIVE">
        <Reveal><Eyebrow>Instructor-led</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-black uppercase tracking-[-0.02em] sm:text-5xl sm:leading-[1.02]">
            Real rooms.<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">real people.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-400">
            Small cohorts, live cameras, answers on the spot. Every minute recorded — every recording yours.
          </p>
        </Reveal>
        <LiveTeasers />
        <Reveal delay={0.1}>
          <p className="mt-8 text-center text-sm text-slate-500">
            Check seats and schedules on the <Link href="/live" className="font-bold text-white underline decoration-rose-400/60 underline-offset-4 hover:decoration-rose-300">live schedule <ArrowRight size={13} className="inline" /></Link>
          </p>
        </Reveal>
      </Section>

      {/* CATALOG */}
      <Section variant="scatter" word="CATALOG">
        <Reveal><Eyebrow>The catalog</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-black uppercase tracking-[-0.02em] sm:text-5xl">Proof, not<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">promises.</span></h2>
            <Link href="/learn" className="group inline-flex items-center gap-1.5 text-sm font-bold text-slate-200 hover:text-white">
              Open full catalog <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
        <FeaturedGrid items={featured} />
      </Section>

      {/* CTA */}
      <section className="relative overflow-hidden px-4 pb-24 sm:px-6">
        <Reveal>
          <div className="grain relative mx-auto max-w-7xl overflow-hidden rounded-[36px] border border-white/12 px-6 py-16 text-center sm:py-24">
            <AuroraCanvas variant="dense" />
            <div className="relative">
              <h2 className="mx-auto max-w-3xl font-display text-4xl font-black uppercase tracking-[-0.02em] sm:text-6xl sm:leading-[0.95]">
                Stop waiting.<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">start building.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-[15px] text-slate-300">
                Join free. Learn with real instructors. Pay securely. Keep everything you learn.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link href="/register" className="btn-aurora rounded-2xl px-8 py-4 text-[15px] font-bold text-white">Create free account</Link>
                <Link href="/tracks" className="rounded-2xl border border-white/25 bg-black/30 px-8 py-4 text-[15px] font-bold backdrop-blur transition hover:bg-black/50">Compare tracks</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
      <MobileNav />
    </main>
  );
}
