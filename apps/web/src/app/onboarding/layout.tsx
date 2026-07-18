"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useEmailVerified } from "@/hooks/use-email-verified";
import { useAuthStore } from "@/stores/auth-store";

function EmailVerifiedGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const verified = useEmailVerified();

  useEffect(() => {
    if (hydrated && !verified) {
      router.replace("/verify-email/check");
    }
  }, [hydrated, verified, router]);

  if (!hydrated || !verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <EmailVerifiedGate>{children}</EmailVerifiedGate>
    </AuthGuard>
  );
}
