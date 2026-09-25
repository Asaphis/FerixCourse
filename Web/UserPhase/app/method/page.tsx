import Link from "next/link";
import { ArrowRight, ShieldCheck, Video, FolderCheck, TrendingUp } from "lucide-react";
import { Navbar, Footer, MobileNav } from "@/components/site";
import { Section, Eyebrow, Reveal } from "@/components/fx";

export const metadata = { title: "Our method — FerixCourse" };

const STEPS = [
  { icon: Video, t: "Learn with humans", d: "Live instructors or carefully recorded lessons — never faceless content dumps. Ask questions, get answers." },
  { icon: FolderCheck, t: "Build real projects", d: "Every program centers on project work that mirrors actual developer tasks, not toy exercises." },
  { icon: TrendingUp, t: "Track real progress", d: "Lesson-by-lesson progress, session attendance and recordings show exactly where you stand." },
  { icon: ShieldCheck, t: "Pay with confidence", d: "Verified checkout and webhook-confirmed enrollment. Access unlocks only when payment confirms." },
];

export default function MethodPage() {
  return (
    <main className="min-h-screen bg-stone-950 pb-20 md:pb-0">
      <Navbar />
      <Section variant="scatter" word="METHOD" seed={29}>
        <div className="pt-24">
          <Reveal><Eyebrow>The FerixCourse method</Eyebrow></Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-black uppercase tracking-[-0.02em] sm:text-6xl sm:leading-[0.95]">
              BUILT FOR<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">outcomes.</span>
            </h1>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {STEPS.map((s, i) => (
              <Reveal key={s.t} delay={i * 0.07}>
                <div className="card-lift relative h-full overflow-hidden rounded-[28px] border border-white/10 bg-stone-900/70 p-8">
                  <span className="pointer-events-none absolute -right-3 -top-7 font-display text-[110px] font-bold leading-none text-white/[.05]">0{i + 1}</span>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/15 ring-1 ring-amber-300/20">
                    <s.icon size={19} className="text-amber-200" />
                  </span>
                  <h2 className="mt-5 font-display text-xl font-bold">{s.t}</h2>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-slate-400">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/learn" className="btn-aurora rounded-2xl px-7 py-3.5 text-sm font-bold text-white">Browse the catalog</Link>
              <Link href="/live" className="group inline-flex items-center gap-1.5 rounded-2xl border border-white/15 px-7 py-3.5 text-sm font-bold hover:bg-white/5">
                See live classes <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>
      <Footer />
      <MobileNav />
    </main>
  );
}
