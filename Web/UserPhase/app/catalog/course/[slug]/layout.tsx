import DashboardShell from "@/components/dashboard/shell";
// fc-sr-only / fc-skip / toasts live in dashboard.css - every shell route needs them.
import "@/app/dashboard.css";

export default function CatalogCourseLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
