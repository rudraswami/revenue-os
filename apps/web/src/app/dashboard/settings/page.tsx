"use client";

import dynamic from "next/dynamic";

const WhatsappConnect = dynamic(() => import("@/components/settings/whatsapp-connect"), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground">Loading…</p>,
});

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect the number your customers message — messages appear in Inbox automatically.
        </p>
      </header>
      <WhatsappConnect />
    </div>
  );
}
