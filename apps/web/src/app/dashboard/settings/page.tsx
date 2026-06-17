"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/dashboard/page-header";

const WhatsappConnect = dynamic(() => import("@/components/settings/whatsapp-connect"), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground">Loading…</p>,
});

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <PageHeader
        title="WhatsApp"
        description="Connect your business number — optional anytime. Messages appear in Inbox automatically."
      />
      <WhatsappConnect />
    </div>
  );
}
