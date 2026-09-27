import DashboardShell from "@/components/dashboard/shell";
import "@/app/dashboard.css";

/*
  Every route below this layout gets the dashboard shell, so the nav, header,
  auth guard and shared data are mounted once and preserved across navigation.
*/
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
