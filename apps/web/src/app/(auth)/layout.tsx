"use client";

import { AuthI18nProvider } from "@/components/auth/auth-i18n";
import { GuestGuard } from "@/components/auth/auth-guard";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthI18nProvider>
      <GuestGuard>{children}</GuestGuard>
    </AuthI18nProvider>
  );
}
