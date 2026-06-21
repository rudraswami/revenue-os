"use client";

import { HelpCircle } from "lucide-react";

const FAQ = [
  {
    q: "What do I need before connecting?",
    a: "A WhatsApp Business number on Meta Cloud API, and access to the Meta Developer console for that business. You only paste one access token — Growvisi finds your number automatically.",
  },
  {
    q: "No number found after I paste my token",
    a: "Regenerate the token in Meta API Setup while logged in as the person who owns the WhatsApp Business Account. The token needs permission to manage that business line.",
  },
  {
    q: "My test message doesn't show in Conversations",
    a: 'Meta\'s "Send test message" is outbound only. From your personal phone, send a WhatsApp to your business number. If you use a Meta test line, add your phone as a test recipient first.',
  },
  {
    q: "Do I need to reconnect every day?",
    a: "Meta temporary tokens expire in about 24 hours. Go to Settings → Refresh access token and paste a new one — you don't need to disconnect your number.",
  },
  {
    q: "I have more than one business number",
    a: "After pasting your token, pick the correct line from the list, then click Connect my number.",
  },
  {
    q: "When does one-click Facebook connect arrive?",
    a: "We're waiting on Meta App Review. Once approved, you'll connect with a single \"Continue with Facebook\" button — no token paste needed.",
  },
];

export function WhatsappOnboardingFaq() {
  return (
    <div className="rounded-2xl border border-[#dce9ff] bg-[#f8f9ff]/40">
      <div className="flex items-center gap-2 border-b border-[#dce9ff] px-4 py-3">
        <HelpCircle className="h-4 w-4 text-accent" />
        <p className="text-sm font-semibold text-foreground">Common questions</p>
      </div>
      <div className="divide-y divide-[#dce9ff]/80">
        {FAQ.map((item) => (
          <details key={item.q} className="group px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground marker:content-none list-none [&::-webkit-details-marker]:hidden">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
