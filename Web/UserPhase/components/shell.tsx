import { Sidebar, BottomNav } from "@/components/nav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950 md:flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-28 md:pb-10">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
