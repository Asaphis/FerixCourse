import DashboardShell from "@/components/dashboard/shell";

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  // Public entry point (the marketing navbar links here), so the shell renders
  // its logged-out variant instead of redirecting to /login.
  return <DashboardShell requireAuth={false}>{children}</DashboardShell>;
}
