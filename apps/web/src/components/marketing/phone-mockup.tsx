"use client";

import { WhatsAppChat, AI_PHONE_CHAT } from "./animated-chat";

export function PhoneMockup({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="phone-frame">
        <div className="phone-screen">
          {children ?? (
            <WhatsAppChat messages={AI_PHONE_CHAT} contactName="Essence Lab" />
          )}
        </div>
      </div>
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-accent/15 blur-3xl" />
    </div>
  );
}
