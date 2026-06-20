"use client";

import { HelpCircle } from "lucide-react";

const FAQ = [
  {
    q: "No numbers found after pasting my token",
    a: "Regenerate the token in Meta API Setup while logged in as the Meta user that owns the WhatsApp Business Account. The token needs whatsapp_business_management and whatsapp_business_messaging permissions.",
  },
  {
    q: "Messages don't appear in Conversations",
    a: 'Do not use Meta\'s "Send test message" (that is outbound). From your personal phone, send a WhatsApp to your business number. Add your phone as a test recipient if you use a Meta test number.',
  },
  {
    q: "Token expired or connection stopped working",
    a: "Temporary API Setup tokens expire in about 24 hours. Generate a new token in Meta and use Refresh access token in Settings — you do not need to disconnect.",
  },
  {
    q: "I have multiple business numbers",
    a: "After pasting your token, pick the correct line from the list before clicking Connect automatically.",
  },
  {
    q: "Need hands-on help?",
    a: "Email support@growvisi.in — we can walk you through Meta API Setup on a short call.",
  },
];

export function WhatsappOnboardingFaq() {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/20">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Common questions</p>
      </div>
      <div className="divide-y divide-border/60">
        {FAQ.map((item) => (
          <details key={item.q} className="group px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground marker:content-none list-none [&::-webkit-details-marker]:hidden">
              {item.q}
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
