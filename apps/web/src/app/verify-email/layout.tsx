import { AuthI18nProvider } from "@/components/auth/auth-i18n";

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return <AuthI18nProvider>{children}</AuthI18nProvider>;
}
