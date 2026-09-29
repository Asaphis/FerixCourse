import DashboardShell from "@/components/dashboard/shell";

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell requireAuth={false}>{children}</DashboardShell>;
}
