import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Data Deletion Instructions — Growvisi",
  description: "How to request deletion of your Growvisi account and associated data.",
};

const LAST_UPDATED = "13 June 2026";

export default function DataDeletionPage() {
  return (
    <LegalPage title="Data Deletion Instructions" lastUpdated={LAST_UPDATED}>
      <LegalSection title="Overview">
        <p>
          This page explains how Growvisi users can request deletion of personal data and workspace data
          associated with our WhatsApp CRM service. This satisfies Meta&apos;s requirement for user data
          deletion instructions for apps that use Facebook Login and WhatsApp integrations.
        </p>
      </LegalSection>

      <LegalSection title="1. Delete your Growvisi account (recommended)">
        <p>
          <strong className="text-foreground">Signed-in users:</strong>
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Log in at https://www.growvisi.in</li>
          <li>Go to <strong className="text-foreground">Dashboard → Settings</strong></li>
          <li>Disconnect any connected WhatsApp numbers</li>
          <li>
            Email{" "}
            <a href="mailto:privacy@growvisi.in" className="text-primary hover:underline">
              privacy@growvisi.in
            </a>{" "}
            from your registered account email with subject: <strong className="text-foreground">Delete my Growvisi account</strong>
          </li>
          <li>We will confirm deletion within 30 days and remove account data from our systems</li>
        </ol>
      </LegalSection>

      <LegalSection title="2. Request by email (without account access)">
        <p>Send an email to:</p>
        <p>
          <a href="mailto:privacy@growvisi.in" className="font-medium text-primary hover:underline">
            privacy@growvisi.in
          </a>
        </p>
        <p>Include:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Subject line: <strong className="text-foreground">Data deletion request</strong></li>
          <li>Your full name and registered email address</li>
          <li>Your organization / workspace name (if known)</li>
          <li>WhatsApp business phone number connected (if any)</li>
          <li>Whether you want full account deletion or specific data removed</li>
        </ul>
        <p>
          We may ask you to verify identity before processing the request to protect your data.
        </p>
      </LegalSection>

      <LegalSection title="3. What we delete">
        <p>After a verified deletion request, we delete or anonymize, where applicable:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Account profile (name, email, organization)</li>
          <li>Workspace settings and team membership</li>
          <li>WhatsApp connection tokens (encrypted credentials)</li>
          <li>Conversations, messages, leads, and pipeline data in your workspace</li>
          <li>Support correspondence related to your account</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. What may be retained">
        <p>We may retain limited information when required by law or for legitimate purposes, such as:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Billing and tax records for the period required by law</li>
          <li>Security logs and abuse-prevention records (typically up to 90 days)</li>
          <li>Data already included in encrypted backups until those backups expire</li>
          <li>Aggregated or anonymized analytics that cannot identify you</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. WhatsApp and Meta data">
        <p>
          Deleting your Growvisi account removes data stored in Growvisi. It does not automatically
          delete your WhatsApp Business Account with Meta. To remove WhatsApp-side data or disconnect
          messaging, you must also manage your account in{" "}
          <a
            href="https://business.facebook.com/wa/manage/home/"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp Manager
          </a>{" "}
          and follow Meta&apos;s processes.
        </p>
        <p>
          If you connected via Facebook Login, you can remove the Growvisi app&apos;s access in your
          Facebook settings under Business integrations or Apps and websites.
        </p>
      </LegalSection>

      <LegalSection title="6. End customers of our business users">
        <p>
          If you are a consumer who messaged a business using WhatsApp, your messages are controlled by
          that business (our customer). Please contact the business directly to exercise your privacy
          rights. They may use Growvisi to process deletion requests on their side.
        </p>
      </LegalSection>

      <LegalSection title="7. Timeline">
        <p>
          We aim to complete verified deletion requests within <strong className="text-foreground">30 days</strong>.
          Complex requests or legal holds may take longer; we will notify you if so.
        </p>
      </LegalSection>

      <LegalSection title="8. More information">
        <p>
          See our{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>{" "}
          for full details on how we process personal data.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
