"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "growvisi-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border bg-card/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] elev-2 backdrop-blur-md md:p-5">
      <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <p className="text-sm leading-relaxed text-muted-foreground md:max-w-2xl">
          We use cookies to provide you with the best website experience and to improve our
          services. By continuing, you agree to our{" "}
          <Link href="/privacy" className="font-medium text-accent hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/cookies" className="font-medium text-accent hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={() => setVisible(false)}>
            Decline
          </Button>
          <Button size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
