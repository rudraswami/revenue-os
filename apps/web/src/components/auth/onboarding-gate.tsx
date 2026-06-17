"use client";

/** Previously forced /onboarding until WhatsApp connected. Now a pass-through — connect is optional. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
