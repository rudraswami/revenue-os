"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Legacy deep links (?assist=help) → dedicated Help & AI page. */
export function AssistHelpRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("assist") !== "help") return;
    if (pathname === "/dashboard/help") return;

    const next = new URLSearchParams(searchParams.toString());
    next.delete("assist");
    const qs = next.toString();
    router.replace(qs ? `/dashboard/help?${qs}` : "/dashboard/help");
  }, [pathname, router, searchParams]);

  return null;
}
