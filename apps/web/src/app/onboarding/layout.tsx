import { AuthGuard } from "@/components/auth/auth-guard";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <EmailVerificationBanner />
      {children}
    </AuthGuard>
  );
}
