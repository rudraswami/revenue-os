import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Data Processing Agreement — Growvisi",
  description: "Growvisi DPA for business customers using WhatsApp conversation intelligence.",
};

const LAST_UPDATED = "17 June 2026";

export default function DpaPage() {
  return (
    <LegalPage title="Data Processing Agreement (DPA)" lastUpdated={LAST_UPDATED}>
      <LegalSection title="Overview">
        <p>
          This Data Processing Agreement (&quot;DPA&quot;) forms part of the agreement between{" "}
          <strong className="text-foreground">Growvisi</strong> (&quot;Processor&quot;) and the business
          customer (&quot;Controller&quot;) that uses our WhatsApp conversation intelligence platform at{" "}
          <strong className="text-foreground">www.growvisi.in</strong>.
        </p>
        <p>
          It applies when Growvisi processes personal data on your behalf — for example WhatsApp
          messages, contact phone numbers, and lead data you connect through the WhatsApp Business
          Platform.
        </p>
      </LegalSection>

      <LegalSection title="1. Roles">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">You (Controller)</strong> determine purposes and means of
            processing customer and lead data.
          </li>
          <li>
            <strong className="text-foreground">Growvisi (Processor)</strong> processes data only on your
            documented instructions via the Service and your account settings.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Subject matter & duration">
        <p>
          Processing relates to providing WhatsApp message ingestion, classification, pipeline tracking,
          and related analytics for your workspace. Processing continues for the subscription term and
          ends when you delete your account or we delete data per your instructions.
        </p>
      </LegalSection>

      <LegalSection title="3. Subprocessors">
        <p>We use the following categories of subprocessors to deliver the Service:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Vercel</strong> — application hosting (India/global edge)
          </li>
          <li>
            <strong className="text-foreground">Supabase</strong> — PostgreSQL database
          </li>
          <li>
            <strong className="text-foreground">Upstash</strong> — Redis queues (when enabled)
          </li>
          <li>
            <strong className="text-foreground">Resend</strong> — transactional email
          </li>
          <li>
            <strong className="text-foreground">OpenAI</strong> — optional AI classification (only when
            enabled and configured)
          </li>
          <li>
            <strong className="text-foreground">Meta / WhatsApp</strong> — messaging platform you connect
          </li>
        </ul>
        <p>
          We require subprocessors to protect data under written terms. Material changes will be
          communicated via our{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="4. Security & confidentiality">
        <p>
          We implement measures described in our Privacy Policy including encryption in transit, access
          controls, and encrypted storage of WhatsApp access tokens. Personnel with access are bound by
          confidentiality obligations.
        </p>
      </LegalSection>

      <LegalSection title="5. Data subject requests">
        <p>
          We assist you in responding to data subject requests where technically feasible. End users may
          also follow our{" "}
          <Link href="/data-deletion" className="text-primary hover:underline">
            Data deletion instructions
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. International transfers">
        <p>
          Data may be processed outside your country. Where required, we rely on appropriate safeguards
          such as standard contractual clauses.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>
          DPA and security questions:{" "}
          <a href="mailto:legal@growvisi.in" className="text-primary hover:underline">
            legal@growvisi.in
          </a>
          . Enterprise customers may request a countersigned copy by email.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
