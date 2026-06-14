import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — Growvisi",
  description: "Terms and conditions for using the Growvisi WhatsApp CRM platform.",
};

const LAST_UPDATED = "13 June 2026";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Agreement">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of Growvisi&apos;s
          website and WhatsApp CRM platform at{" "}
          <a href="https://www.growvisi.in" className="text-primary hover:underline">
            www.growvisi.in
          </a>{" "}
          (the &quot;Service&quot;). By creating an account or using the Service, you agree to these
          Terms and our{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          If you use the Service on behalf of a company, you represent that you have authority to bind that
          company.
        </p>
      </LegalSection>

      <LegalSection title="2. The Service">
        <p>
          Growvisi provides tools for businesses to manage WhatsApp conversations, leads, pipelines,
          automations, analytics, and related features. The Service integrates with the WhatsApp Business
          Platform via Meta&apos;s authorized APIs.
        </p>
        <p>
          We may update, add, or remove features. We do not guarantee uninterrupted or error-free operation.
        </p>
      </LegalSection>

      <LegalSection title="3. Account registration">
        <p>
          You must provide accurate registration information and keep your credentials secure. You are
          responsible for all activity under your account and workspace.
        </p>
        <p>
          Connecting WhatsApp requires a valid Meta Business account and WhatsApp Business Account that
          you are authorized to use. You must complete Meta&apos;s connection flow and maintain compliance
          with Meta and WhatsApp requirements.
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Violate WhatsApp Business Messaging Policy, Meta Platform Terms, or applicable law</li>
          <li>Send spam, unsolicited bulk messages, or prohibited content</li>
          <li>Use the Service for harassment, fraud, malware, or illegal products or services</li>
          <li>Attempt to access another user&apos;s data without authorization</li>
          <li>Reverse engineer, scrape, or abuse the Service or APIs except as permitted by law</li>
          <li>Resell or sublicense the Service without our written consent</li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these Terms or third-party policies.
        </p>
      </LegalSection>

      <LegalSection title="5. Customer responsibilities">
        <p>As a business customer, you are responsible for:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Obtaining lawful consent to message your contacts on WhatsApp</li>
          <li>Providing your own privacy notice to your end customers where required</li>
          <li>Message template approval and opt-in rules where applicable</li>
          <li>Accuracy of data you import or create in the Service</li>
          <li>Fees charged by Meta/WhatsApp for messaging, separate from Growvisi subscription fees</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Subscription and fees">
        <p>
          Paid plans, trial periods, and billing terms are described on our pricing page. Fees are billed
          in advance unless stated otherwise. Taxes may apply. Failure to pay may result in suspension.
        </p>
        <p>
          Meta/WhatsApp messaging costs are billed by Meta under your WhatsApp Business Account and are
          not included in Growvisi fees unless explicitly stated.
        </p>
      </LegalSection>

      <LegalSection title="7. Intellectual property">
        <p>
          Growvisi owns the Service, software, branding, and documentation. You retain ownership of your
          business data and content you submit. You grant us a limited license to host, process, and
          display your data solely to provide the Service.
        </p>
      </LegalSection>

      <LegalSection title="8. Confidentiality and security">
        <p>
          We implement reasonable security measures as described in our Privacy Policy. You must use
          strong passwords and restrict access within your organization appropriately.
        </p>
      </LegalSection>

      <LegalSection title="9. Third-party services">
        <p>
          The Service relies on third parties including Meta/WhatsApp, hosting providers, and optional AI
          providers. Your use of those integrations is subject to their terms. We are not responsible for
          third-party outages or policy changes.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimer">
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY
          KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY LAW.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, GROWVISI AND ITS SUPPLIERS WILL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
          REVENUE, DATA, OR GOODWILL. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THE SERVICE IS
          LIMITED TO THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE
          CLAIM, OR ONE HUNDRED US DOLLARS (USD $100), WHICHEVER IS GREATER.
        </p>
      </LegalSection>

      <LegalSection title="12. Indemnification">
        <p>
          You will defend and indemnify Growvisi against claims arising from your use of the Service, your
          messages or content, or your violation of these Terms or applicable law.
        </p>
      </LegalSection>

      <LegalSection title="13. Termination">
        <p>
          You may stop using the Service and request account deletion at any time. We may suspend or
          terminate access for breach of these Terms, legal requirements, or risk to the platform.
        </p>
        <p>
          Upon termination, your right to use the Service ends. Provisions that by nature should survive
          (e.g. liability limits, indemnity) will survive.
        </p>
      </LegalSection>

      <LegalSection title="14. Governing law">
        <p>
          These Terms are governed by the laws of India, without regard to conflict-of-law principles,
          unless mandatory local consumer laws require otherwise. Courts in Bangalore, Karnataka shall have
          exclusive jurisdiction, subject to applicable law.
        </p>
      </LegalSection>

      <LegalSection title="15. Contact">
        <p>
          Questions about these Terms:{" "}
          <a href="mailto:legal@growvisi.in" className="text-primary hover:underline">
            legal@growvisi.in
          </a>{" "}
          or{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact form
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
