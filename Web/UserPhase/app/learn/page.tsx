import AppShell from "@/components/shell";

export default function LearnPage() {
  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Learn</h1>
      <p className="text-slate-400 text-sm mt-1">Live classes and recorded courses from the database will appear here. No mock data.</p>
      <div className="mt-6 glass rounded-3xl p-10 text-center">
        <p className="font-display font-semibold text-lg">No courses available yet.</p>
        <p className="text-sm text-slate-400 mt-1">Phase 2 wires this page to /courses + /classrooms with search, category and level filters.</p>
      </div>
    </AppShell>
  );
}
