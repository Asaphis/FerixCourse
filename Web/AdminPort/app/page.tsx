"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/shell";
import { adminFetch, adminToken } from "@/lib/admin";

type Stats = {
  students: number; publishedCourses: number; activeClassrooms: number;
  enrollments: number; successfulPayments: number; revenueKobo: number;
  pendingBookings: number; pendingRequests: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!adminToken()) router.push("/login");
    else adminFetch("/admin/stats").then(setStats).catch((e) => setErr(e.message));
  }, [router]);

  const cards: [string, number | string][] = stats
    ? [
        ["Students", stats.students],
        ["Published courses", stats.publishedCourses],
        ["Active classrooms", stats.activeClassrooms],
        ["Enrollments", stats.enrollments],
        ["Successful payments", stats.successfulPayments],
        ["Revenue (kobo)", stats.revenueKobo],
        ["Pending bookings", stats.pendingBookings],
        ["Pending requests", stats.pendingRequests],
      ]
    : [];

  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold">Dashboard</h1>
      <p className="text-sm text-slate-400 mt-1">Real numbers from the database. Empty states show zero.</p>
      {err && <p className="card mt-5 text-sm text-rose-200 border-rose-400/30">{err}</p>}
      {!stats && !err && <p className="text-sm text-slate-400 mt-6">Loading stats…</p>}
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(([t, v]) => (
          <div key={t} className="card">
            <p className="text-xs text-slate-400">{t}</p>
            <p className="font-display text-3xl font-bold mt-1">{v}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}
