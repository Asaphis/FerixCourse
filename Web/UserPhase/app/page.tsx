import Link from "next/link";
import { ArrowRight, Play, CalendarCheck } from "lucide-react";
import { Navbar, Footer, MobileNav } from "@/components/site";
import { Starfield, Section, Eyebrow, Reveal, DriftOrb, AuroraCanvas } from "@/components/fx";
import { Counter, TrackTeasers, MethodTeasers, LiveTeasers, FeaturedGrid, ClassroomMock } from "@/components/sections";
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
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-16 pt-36 sm:px-6 sm:pt-44">
          <div className="lg:col-span-1">
            <Reveal><Eyebrow>Live cohorts · Courses · Mentorship</Eyebrow></Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-6 font-display text-[54px] font-black uppercase leading-[0.9] tracking-[-0.02em] sm:text-7xl lg:text-[88px]">
                <span className="text-stone-100">Learn</span>
                <br /><span className="text-outline">out loud</span>
                <br /><span className="relative inline-block pb-4">ship real.
                  <svg className="absolute -bottom-1 left-0 h-[0.32em] w-full" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden>
                    <defs><linearGradient id="swg" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#EA580C" /><stop offset=".6" stopColor="#F43F5E" /><stop offset="1" stopColor="#FBBF24" />
                    </linearGradient></defs>
                    <path className="swash-draw" d="M6 17 C 80 7, 220 7, 294 13" stroke="url(#swg)" strokeWidth="8" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-slate-400">
                FerixCourse is a live-first technology school. Join real instructor-led
                classrooms, learn at your pace with recorded courses, or go private
                with one-on-one mentorship.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/learn" className="btn-aurora group inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-bold text-white">
                  <Play size={17} className="fill-white" /> Start learning
                </Link>
                <Link href="/book" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[.04] px-7 py-4 text-[15px] font-bold backdrop-blur transition hover:border-white/30 hover:bg-white/[.08]">
                  <CalendarCheck size={17} /> Book mentorship
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.32}>
              <div className="mt-10 flex gap-9">
                {[
                  [courses.length, "Courses live"],
                  [rooms.length, "Active cohorts"],
                  [4, "Ways to learn"],
                ].map(([v, l]) => (
                  <div key={l as string}>
                    <p className="font-display text-[28px] font-bold"><Counter to={v as number} /></p>
                    <p className="mt-0.5 text-[12px] font-medium uppercase tracking-[0.14em] text-slate-500">{l}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.2} className="lg:col-span-1">
            <ClassroomMock />
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
        <Reveal><Eyebrow>Learning tracks</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-black uppercase tracking-[-0.02em] sm:text-5xl sm:leading-[1.02]">
            Train your way.<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">no compromises.</span>
          </h2>
        </Reveal>
        <TrackTeasers />
        <Reveal delay={0.1}>
          <p className="mt-8 text-center text-sm text-slate-500">
            Full breakdown on the <Link href="/tracks" className="font-bold text-white underline decoration-rose-400/60 underline-offset-4 hover:decoration-rose-300">tracks page <ArrowRight size={13} className="inline" /></Link>
          </p>
        </Reveal>
      </Section>

      {/* METHOD */}
      <Section variant="scatter" word="METHOD">
        <Reveal><Eyebrow>The method</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-black uppercase tracking-[-0.02em] sm:text-5xl sm:leading-[1.02]">
            From curious<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">to capable.</span>
          </h2>
        </Reveal>
        <MethodTeasers />
        <Reveal delay={0.1}>
          <p className="mt-8 text-center text-sm text-slate-500">
            Read the full method on the <Link href="/method" className="font-bold text-white underline decoration-amber-300/60 underline-offset-4 hover:decoration-amber-200">method page <ArrowRight size={13} className="inline" /></Link>
          </p>
        </Reveal>
      </Section>

      {/* LIVE */}
      <Section variant="dense" word="LIVE">
        <Reveal><Eyebrow>Live classrooms</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-black uppercase tracking-[-0.02em] sm:text-5xl sm:leading-[1.02]">
            Not a webinar.<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">a classroom.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-400">
            Cameras on, questions live, screen shared both ways. Every session is
            recorded automatically so you never lose a lesson.
          </p>
        </Reveal>
        <LiveTeasers />
        <Reveal delay={0.1}>
          <p className="mt-8 text-center text-sm text-slate-500">
            See schedules and seats on the <Link href="/live" className="font-bold text-white underline decoration-rose-400/60 underline-offset-4 hover:decoration-rose-300">live page <ArrowRight size={13} className="inline" /></Link>
          </p>
        </Reveal>
      </Section>

      {/* CATALOG */}
      <Section variant="scatter" word="CATALOG">
        <Reveal><Eyebrow>Fresh from the catalog</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-black uppercase tracking-[-0.02em] sm:text-5xl">Start with<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">live proof.</span></h2>
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
                One class away<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">from everything.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-[15px] text-slate-300">
                Free account. Real instructors. Verified payments. Recordings you keep forever.
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
