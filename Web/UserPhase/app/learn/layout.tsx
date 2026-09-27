import DashboardShell from "@/components/dashboard/shell";
import "@/app/dashboard.css";

/* The catalog is browsable while logged out, so this shell does not force a
   login redirect — it swaps to a public variant instead. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell requireAuth={false}>{children}</DashboardShell>;
}
