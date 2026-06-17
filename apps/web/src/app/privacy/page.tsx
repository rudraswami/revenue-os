import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Growvisi",
  description: "How Growvisi collects, uses, and protects your data when you use our WhatsApp CRM.",
};

const LAST_UPDATED = "13 June 2026";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Who we are">
        <p>
          Growvisi (&quot;Growvisi&quot;, &quot;we&quot;, &quot;us&quot;) provides a WhatsApp
          conversation intelligence platform at{" "}
          <a href="https://www.growvisi.in" className="text-primary hover:underline">
            www.growvisi.in
          </a>
          . This Privacy Policy explains how we collect, use, store, and share information when you use
          our website, application, and related services (the &quot;Service&quot;).
        </p>
        <p>
          <strong className="text-foreground">Contact:</strong> privacy@growvisi.in
        </p>
      </LegalSection>

      <LegalSection title="2. Who this policy applies to">
        <p>
          This policy applies to business users who register for Growvisi (&quot;Customers&quot;) and,
          where applicable, to end customers who message a business through WhatsApp and whose data is
          processed in the Service on the Customer&apos;s behalf (&quot;End Users&quot;).
        </p>
        <p>
          Customers are responsible for their own privacy notices to End Users and for obtaining any
          required consents under applicable law, including WhatsApp and Meta policies.
        </p>
      </LegalSection>

      <LegalSection title="3. Information we collect">
        <p>
          <strong className="text-foreground">Account and profile data:</strong> name, email address,
          organization name, password (stored hashed), and workspace settings when you register or use
          the Service.
        </p>
        <p>
          <strong className="text-foreground">WhatsApp and messaging data:</strong> when you connect a
          WhatsApp Business account through Meta&apos;s authorized flow, we receive and store message
          content and metadata needed for analytics — including customer messages and business-side
          messages visible via the Cloud API. We analyze conversations to classify intent, score
          leads, and update your pipeline. Automated replies to customers are typically handled by
          Meta Business Agent inside WhatsApp; optional human-agent replies from Growvisi are
          supplementary and subject to WhatsApp&apos;s messaging policies.
        </p>
        <p>
          <strong className="text-foreground">Meta / Facebook login data:</strong> when you use
          &quot;Continue with Facebook&quot; to connect WhatsApp, Meta provides authorization tokens and
          identifiers needed to operate the integration. We do not receive your Facebook password.
        </p>
        <p>
          <strong className="text-foreground">Technical and usage data:</strong> IP address, browser
          type, device information, log data, cookies or similar technologies, and how you interact with
          the Service (e.g. pages visited, features used).
        </p>
        <p>
          <strong className="text-foreground">Payment and billing:</strong> if you purchase a paid plan,
          payment details are processed by our payment provider; we receive billing status and limited
          transaction metadata, not full card numbers.
        </p>
        <p>
          <strong className="text-foreground">Support communications:</strong> information you send when
          you contact us for help, demos, or sales.
        </p>
      </LegalSection>

      <LegalSection title="4. How we use information">
        <p>We use information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide conversation intelligence: ingest messages, classify intent, score leads, pipeline analytics, and team insights</li>
          <li>Authenticate users and secure accounts</li>
          <li>Connect and maintain WhatsApp Business API integrations via Meta (webhooks)</li>
          <li>Optionally send human-agent replies when your team initiates takeover (within WhatsApp policy windows)</li>
          <li>Send service-related emails (e.g. password reset, security notices)</li>
          <li>Improve, debug, and develop the Service</li>
          <li>Comply with legal obligations and enforce our Terms of Service</li>
          <li>Prevent fraud, abuse, and violations of WhatsApp or Meta policies</li>
        </ul>
        <p>
          We do not sell your personal information. We do not use WhatsApp message content to train
          public third-party AI models without your explicit configuration and consent where required.
        </p>
      </LegalSection>

      <LegalSection title="5. Legal bases (EEA / UK users)">
        <p>Where GDPR or similar laws apply, we rely on:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Contract</strong> — to provide the Service you requested
          </li>
          <li>
            <strong className="text-foreground">Legitimate interests</strong> — security, product
            improvement, and fraud prevention
          </li>
          <li>
            <strong className="text-foreground">Consent</strong> — where required (e.g. optional
            marketing cookies)
          </li>
          <li>
            <strong className="text-foreground">Legal obligation</strong> — when law requires processing
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. How we share information">
        <p>We may share information with:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Meta / WhatsApp</strong> — to send and receive messages
            through the WhatsApp Business Platform when you connect your account
          </li>
          <li>
            <strong className="text-foreground">Infrastructure providers</strong> — hosting, databases,
            caching, email delivery, and monitoring (e.g. cloud hosting, database, and email providers)
          </li>
          <li>
            <strong className="text-foreground">AI providers</strong> — only when you enable AI features,
            limited to data needed to generate suggestions or classifications
          </li>
          <li>
            <strong className="text-foreground">Professional advisers</strong> — lawyers, auditors, or
            insurers when necessary
          </li>
          <li>
            <strong className="text-foreground">Authorities</strong> — if required by law or to protect
            rights and safety
          </li>
        </ul>
        <p>
          We require service providers to process data only on our instructions and with appropriate
          safeguards.
        </p>
      </LegalSection>

      <LegalSection title="7. International transfers">
        <p>
          We and our providers may process data in countries other than your own. Where required, we use
          appropriate safeguards such as standard contractual clauses or equivalent mechanisms.
        </p>
      </LegalSection>

      <LegalSection title="8. Data retention">
        <p>
          We retain account and message data while your subscription is active and as needed to provide the
          Service. After account closure, we delete or anonymize data within a reasonable period unless
          retention is required for legal, security, or dispute-resolution purposes.
        </p>
        <p>
          See our{" "}
          <Link href="/data-deletion" className="text-primary hover:underline">
            Data Deletion Instructions
          </Link>{" "}
          for how to request deletion.
        </p>
      </LegalSection>

      <LegalSection title="9. Security">
        <p>
          We use technical and organizational measures including encryption in transit (HTTPS), access
          controls, hashed passwords, and encrypted storage of sensitive integration tokens. No method of
          transmission or storage is 100% secure.
        </p>
      </LegalSection>

      <LegalSection title="10. Your rights">
        <p>
          Depending on your location, you may have rights to access, correct, delete, restrict, or port
          your personal data, and to object to or withdraw consent for certain processing.
        </p>
        <p>
          To exercise rights, email{" "}
          <a href="mailto:privacy@growvisi.in" className="text-primary hover:underline">
            privacy@growvisi.in
          </a>{" "}
          or follow{" "}
          <Link href="/data-deletion" className="text-primary hover:underline">
            data deletion instructions
          </Link>
          . You may also lodge a complaint with your local data protection authority.
        </p>
        <p>
          <strong className="text-foreground">California residents:</strong> we do not sell personal
          information. You may request access or deletion as described above.
        </p>
      </LegalSection>

      <LegalSection title="11. Cookies">
        <p>
          We use essential cookies for authentication and session management. We may use analytics cookies
          with your consent where required. You can control cookies through your browser and our cookie
          notice on the website.
        </p>
      </LegalSection>

      <LegalSection title="12. Children">
        <p>
          The Service is intended for businesses and is not directed to children under 16. We do not
          knowingly collect children&apos;s personal information.
        </p>
      </LegalSection>

      <LegalSection title="13. WhatsApp and Meta">
        <p>
          Your use of WhatsApp through Growvisi is also subject to{" "}
          <a
            href="https://www.whatsapp.com/legal/business-terms"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp Business Terms
          </a>
          ,{" "}
          <a
            href="https://www.whatsapp.com/legal/business-policy"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp Business Messaging Policy
          </a>
          , and applicable Meta terms. You must comply with those policies when messaging through the
          Service.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes">
        <p>
          We may update this Privacy Policy from time to time. We will post the updated version on this
          page and update the &quot;Last updated&quot; date. Material changes may be notified by email or
          in-app notice where appropriate.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
