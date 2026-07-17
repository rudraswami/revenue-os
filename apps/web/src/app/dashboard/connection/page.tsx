"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { WhatsappConnectionHealth } from "@/components/settings/whatsapp-connection-health";
import { Button } from "@/components/ui/button";
import { EYEBROW } from "@/lib/brand-copy";

export default function ConnectionPage() {
  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={EYEBROW.overview}
        title="WhatsApp connection"
        description="Live health for your Business number — webhooks, token, and message ingest."
      />

      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 rounded-xl px-2 text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </Button>
      </div>

      <WhatsappConnectionHealth />

      <p className="mt-6 text-xs text-muted-foreground">
        Need to connect another number or edit credentials?{" "}
        <Link href="/dashboard/settings?tab=whatsapp" className="font-semibold text-accent hover:underline">
          Open WhatsApp settings →
        </Link>
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Installing Growvisi for a client? Use the{" "}
        <Link href="/dashboard/partner" className="font-semibold text-accent hover:underline">
          Partner install kit
        </Link>{" "}
        from Agency hub when you need the playbook — it is not in the main nav for every workspace.
      </p>
    </div>
  );
}
