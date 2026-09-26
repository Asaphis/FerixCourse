import Link from "next/link";
import { MonitorPlay, BookOpen, UserCheck, Wand2, ArrowRight, Check } from "lucide-react";
import { Navbar, Footer, MobileNav } from "@/components/site";
import { Section, Eyebrow, Reveal } from "@/components/fx";

export const metadata = { title: "Learning tracks — FerixCourse" };

const TRACKS = [
  {
    icon: MonitorPlay, name: "Live training", href: "/live", price: "Per cohort",
    desc: "Join a scheduled cohort led by a real instructor. Cameras on, questions live, projects every week.",
    points: ["HD video + screen share", "Capped seats per cohort", "Automatic session recordings", "Chat, Q&A and feedback"],
  },
  {
    icon: BookOpen, name: "Self-paced courses", href: "/learn", price: "Per course",
    desc: "Recorded lessons you own forever. Learn at 2am or 2pm — progress tracked lesson by lesson.",
    points: ["Watch anytime, anywhere", "Downloadable resources", "Progress tracking", "Free lesson previews"],
  },
  {
    icon: UserCheck, name: "One-on-one mentorship", href: "/book", price: "Per session",
    desc: "Private training, online or in person. A curriculum built around exactly what you need.",
    points: ["30 min – full day sessions", "Online or physical", "Flexible scheduling", "Direct instructor access"],
  },
  {
    icon: Wand2, name: "Custom training", href: "/request", price: "Quoted",
    desc: "Can't find your topic? Describe it and we design a private classroom or cohort for you.",
    points: ["Any technology topic", "Individual or group", "You set the schedule", "Converted to real classroom"],
  },
];

export default function TracksPage() {
  return (
    <main className="min-h-screen bg-stone-950 pb-20 md:pb-0">
      <Navbar />
      <Section variant="dense" word="TRACKS">
        <div className="pt-24">
          <Reveal><Eyebrow>Learning tracks</Eyebrow></Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-black uppercase tracking-[-0.02em] sm:text-6xl sm:leading-[0.95]">
              FOUR DOORS.<br /><span className="font-accent font-normal normal-case tracking-normal text-aurora">one standard.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-slate-400">
              Every track is payment-gated, instructor-backed and project-based.
              Same bar, different doors — real instructors, project work and proof of progress in all four.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {TRACKS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.07}>
                <div className="card-lift h-full rounded-[28px] border border-white/10 bg-stone-900/70 p-8 backdrop-blur">
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/30 to-rose-500/20 ring-1 ring-white/10">
                      <t.icon size={21} className="text-rose-200" />
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11.5px] font-semibold text-slate-300">{t.price}</span>
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-bold">{t.name}</h2>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-slate-400">{t.desc}</p>
                  <ul className="mt-5 space-y-2.5">
                    {t.points.map((p) => (
                      <li key={p} className="flex items-center gap-2.5 text-[13.5px] text-slate-300">
                        <Check size={14} className="shrink-0 text-emerald-300" /> {p}
                      </li>
                    ))}
                  </ul>
                  <Link href={t.href} className="group mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-white">
                    Open {t.name.toLowerCase()} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>
      <Footer />
      <MobileNav />
    </main>
  );
}
