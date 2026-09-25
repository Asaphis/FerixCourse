import AppShell from "@/components/shell";

export default function DashboardPage() {
  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">Welcome back</h1>
      <p className="text-slate-400 text-sm mt-1">Connect Supabase Auth + Backend to populate this dashboard with real data.</p>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { t: "Continue Learning", d: "You have no active courses yet." },
          { t: "Upcoming Classes", d: "No upcoming live classes." },
          { t: "My Courses", d: "Enroll to see courses here." },
        ].map((c) => (
          <div key={c.t} className="glass rounded-3xl p-6">
            <p className="font-display font-semibold">{c.t}</p>
            <p className="text-sm text-slate-400 mt-1">{c.d}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
