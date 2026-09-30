import { Navbar, Footer, MobileNav } from "@/components/site";
import { Section, Eyebrow, Reveal } from "@/components/fx";
import Link from "next/link";

function Doc({ title, eyebrow, intro, blocks }: { title: React.ReactNode; eyebrow: string; intro: string; blocks: [string, string][] }) {
  return (
    <main className="min-h-screen bg-stone-950 pb-20 md:pb-0">
      <Navbar />
      <Section variant="scatter">
        <div className="mx-auto max-w-3xl pt-24">
          <Reveal><Eyebrow>{eyebrow}</Eyebrow></Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-[-0.02em] sm:text-5xl">{title}</h1>
          </Reveal>
          <Reveal delay={0.14}><p className="mt-5 text-[15px] leading-relaxed text-stone-400">{intro}</p></Reveal>
          {blocks.map(([h, p]) => (
            <Reveal key={h} delay={0.05}>
              <h2 className="mt-8 font-display text-xl font-bold">{h}</h2>
              <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-stone-400">{p}</p>
            </Reveal>
          ))}
          <Reveal delay={0.05}>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/catalog" className="btn-aurora rounded-2xl px-6 py-3 text-sm font-bold text-white">Browse training</Link>
              <Link href="/contact" className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-bold hover:bg-white/5">Talk to us</Link>
            </div>
          </Reveal>
        </div>
      </Section>
      <Footer />
      <MobileNav />
    </main>
  );
}

export function AboutPage() {
  return (
    <Doc eyebrow="About FerixCourse" title={<>A school built for people who ship.</>} intro="FerixCourse is a live-first technology school. Small cohorts, real instructors, recorded courses you keep, and private mentorship — every path verified, tracked and project-based." blocks={[
      ["Live first", "Cohorts meet on fixed schedules with cameras on. Every session is recorded automatically, so nobody loses a lesson."],
      ["Pay with proof", "Checkout is verified before access unlocks. Every payment carries a receipt, and every enrollment is tracked."],
      ["Custom by design", "Can't find your topic? Request it. Popular requests become real classrooms with waiting lists that convert."],
    ]} />
  );
}

export function ContactPage() {
  return (
    <Doc eyebrow="Contact" title={<>Talk to a human.</>} intro="Questions about cohorts, payments, bookings or custom training — send a message and we reply personally." blocks={[
      ["Messages", "Logged-in learners: open Messages from your dashboard for the fastest reply."],
      ["Bookings", "For private training, send a booking with your topic and schedule first — then we discuss price and confirm."],
      ["Response time", "We typically reply within 48 hours on working days."],
    ]} />
  );
}

export function TermsPage() {
  return (
    <Doc eyebrow="Terms of use" title={<>Fair terms, plain words.</>} intro="The short version of the rules that keep FerixCourse running for everyone." blocks={[
      ["Accounts", "One account per learner. You are responsible for keeping your password private."],
      ["Payments", "Access to paid courses, classrooms and confirmed bookings unlocks only after verified payment. Transactions carry provider references and receipts."],
      ["Content", "Course videos, PDFs, recordings and classroom materials are licensed to enrolled members only — not for redistribution."],
      ["Live conduct", "Cameras and mics are classroom tools. Disruptive behavior can end a session and suspend access."],
      ["Refunds", "Contact support with your transaction reference. Each case is reviewed individually."],
    ]} />
  );
}

export function PrivacyPage() {
  return (
    <Doc eyebrow="Privacy" title={<>Your data stays yours.</>} intro="What we collect, why, and the room rule: your classroom activity is visible only inside that room." blocks={[
      ["What we store", "Account details, enrollments, payments with provider references, bookings, requests, messages and learning progress — everything needed to run your training."],
      ["Room isolation", "Classroom files, discussions, recordings and live sessions are visible only to that room's members. One-on-one content only to its two parties."],
      ["Payments", "Card details never touch our servers — checkout runs through the payment provider, which returns only confirmations and references."],
      ["Your rights", "Ask for an export or deletion of your data at any time via Messages or Contact."],
    ]} />
  );
}
