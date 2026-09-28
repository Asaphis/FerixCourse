"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Icon, type IconName } from "@/components/icons";
import { PageHead, ErrorNote, Skeleton } from "@/components/ui";
import { adminFetch, adminToken, money } from "@/lib/admin";
import type { Stats as AdminStats } from "@/lib/admin-types";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400";

const STAT_CARDS: { key: keyof AdminStats; label: string; icon: IconName; money?: boolean; href: string }[] = [
  { key: "students", label: "Learners", icon: "users", href: "/users" },
  { key: "publishedCourses", label: "Published courses", icon: "book", href: "/courses" },
  { key: "activeClassrooms", label: "Active classrooms", icon: "school", href: "/classrooms" },
  { key: "enrollments", label: "Enrollments", icon: "barChart", href: "/courses" },
  { key: "successfulPayments", label: "Successful payments", icon: "card", href: "/transactions" },
  /* Rendered as currency: the API stores minor units, and the raw value
     (158000000) overflowed the tile and was unreadable. */
  { key: "revenueKobo", label: "Revenue", icon: "wallet", money: true, href: "/transactions" },
  { key: "pendingBookings", label: "Pending bookings", icon: "calendar", href: "/bookings" },
  { key: "pendingRequests", label: "Pending requests", icon: "clipboard", href: "/requests" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!adminToken()) router.push("/login");
    else adminFetch("/admin/stats").then(setStats).catch((e) => setErr(e.message));
  }, [router]);

  return (
    <Shell>
      <PageHead
        title="Overview"
        sub="Every figure comes from the live database."
        actions={
          <Link className="ad-btn ad-btn-ghost" href="/live">
            <Icon name="live" size={14} /> Live control
          </Link>
        }
      />

      {err ? <ErrorNote message={err} /> : null}
      {!stats && !err ? <Skeleton height={104} count={4} /> : null}

      {stats ? (
        <div className="ad-stat-grid">
          {STAT_CARDS.map((c) => {
            const raw = stats[c.key] as number;
            const value = c.money ? money(raw) : raw.toLocaleString("en-NG");
            return (
              <Link key={c.key} href={c.href} className={`ad-card ad-stat ad-stat-link ${FOCUS}`}>
                <span className="ad-stat-icon" aria-hidden="true">
                  <Icon name={c.icon} size={19} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="ad-stat-label">{c.label}</span>
                  {/* tabular-nums + minmax(0,1fr) keep long figures inside the
                      tile instead of bleeding past its right edge. */}
                  <span className="ad-stat-value">{value}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </Shell>
  );
}