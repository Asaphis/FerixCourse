import { notFound } from "next/navigation";
import { PlayCircle, Users, Check, LockOpen } from "lucide-react";
import { Navbar, Footer, MobileNav } from "@/components/site";
import { Section, Eyebrow, Reveal } from "@/components/fx";
import EnrollButton from "@/components/enroll";
import { getCourse, formatMoney } from "@/lib/api";

export default async function CoursePage({ params }: { params: { slug: string } }) {
  const c = await getCourse(params.slug);
  if (!c) notFound();

  return (
    <main className="min-h-screen bg-night-950 pb-20 md:pb-0">
      <Navbar />
      <Section hues={["139,92,246", "217,70,239", "251,191,36"]}>
        <div className="grid gap-10 pt-24 lg:grid-cols-[1.4fr_.8fr]">
          <div>
            <Reveal><Eyebrow>{c.category ?? "Course"} · {c.level}</Eyebrow></Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">{c.title}</h1>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-5 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-slate-400">{c.description || c.short_description}</p>
            </Reveal>
            <p className="mt-5 inline-flex items-center gap-2 text-sm text-slate-300"><Users size={15} className="text-fuchsia-300" /> {c.students ?? 0} students enrolled</p>
            <Reveal delay={0.1}>
              <h2 className="mt-10 font-display text-xl font-bold">Curriculum</h2>
              {(c.sections ?? []).length === 0 ? (
                <p className="mt-3 rounded-2xl border border-white/10 p-5 text-sm text-slate-500">Curriculum publishes with the course. Enrolled students get notified.</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {c.sections.map((s: any) => (
                    <div key={s.id} className="rounded-2xl border border-white/10 bg-night-900/70 p-5">
                      <p className="font-display font-bold">{s.title}</p>
                      <div className="mt-3 grid gap-1.5">
                        {(s.lessons ?? []).map((l: any) => (
                          <p key={l.id} className="flex items-center gap-2.5 rounded-xl bg-black/30 px-3.5 py-2.5 text-[13.5px] text-slate-300">
                            {l.is_free_preview ? <LockOpen size={13} className="text-emerald-300" /> : <PlayCircle size={14} className="text-slate-500" />}
                            {l.title}
                            {l.is_free_preview && <span className="ml-auto text-[11px] font-bold text-emerald-300">FREE PREVIEW</span>}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <div className="h-fit rounded-[28px] border border-white/12 bg-night-900/85 p-7 backdrop-blur lg:sticky lg:top-28">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Lifetime access</p>
              <p className="mt-2 font-display text-4xl font-bold">{formatMoney(c.price_kobo, c.currency)}</p>
              <div className="mt-6">
                <EnrollButton productType="course" productId={c.id} priceKobo={c.price_kobo} currency={c.currency} />
              </div>
              <ul className="mt-6 space-y-2 text-[13px] text-slate-400">
                {["Watch anytime, forever", "Downloadable resources", "Progress tracking", "Verified secure payment"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check size={13} className="text-emerald-300" /> {t}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Section>
      <Footer />
      <MobileNav />
    </main>
  );
}
