import DashboardShell from "@/components/dashboard/shell";
// fc-sr-only / fc-skip / toasts live in dashboard.css — every shell route needs them.
import "@/app/dashboard.css";

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  // Public entry point (the marketing navbar links here), so the shell renders
  // its logged-out variant instead of redirecting to /login.
  return <DashboardShell requireAuth={false}>{children}</DashboardShell>;
}
