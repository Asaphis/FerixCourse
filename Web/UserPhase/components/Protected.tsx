"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiMe } from "@/lib/auth";

/* Shared guard for ALL private pages. Put it in AppShell once —
   every page inside is protected, including future pages. */
export default function Protected({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(!!disabled);

  useEffect(() => {
    if (disabled) return;
    apiMe().then((u) => {
      if (!u) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      else setOk(true);
    });
  }, [router, pathname, disabled]);

  if (!ok) {
    return (
      <div className="grid gap-3">
        <div className="h-9 w-56 animate-pulse rounded-xl bg-white/5" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-3xl border border-white/8 bg-white/[.03]" />)}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
