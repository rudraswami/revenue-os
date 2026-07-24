import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Cookie Policy — Growvisi",
  description: "How Growvisi uses cookies and similar technologies.",
  path: "/cookies",
});

const LAST_UPDATED = "17 June 2026";

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection title="Overview">
        <p>
          Growvisi uses cookies and similar technologies on{" "}
          <strong className="text-foreground">www.growvisi.in</strong> to operate the service, keep you
          signed in, and improve product quality. This policy explains what we use and your choices.
        </p>
      </LegalSection>

      <LegalSection title="1. What are cookies?">
        <p>
          Cookies are small text files stored on your device when you visit a website. We also use
          local storage for preferences (for example, cookie consent and session tokens).
        </p>
      </LegalSection>

      <LegalSection title="2. Cookies we use">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Essential</strong> — authentication session, security,
            and load balancing (required for the app to work)
          </li>
          <li>
            <strong className="text-foreground">Preferences</strong> — cookie consent choice, UI
            settings
          </li>
          <li>
            <strong className="text-foreground">Analytics</strong> — only if enabled; aggregated usage
            to improve the product (we do not sell this data)
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Third-party cookies">
        <p>
          When you use <strong className="text-foreground">Continue with Facebook</strong> (WhatsApp
          Embedded Signup), Meta may set cookies in their domain during OAuth. See{" "}
          <a
            href="https://www.facebook.com/privacy/policies/cookies/"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Meta&apos;s cookie policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="4. Your choices">
        <p>
          You can block or delete cookies in your browser settings. Essential cookies are required to stay
          logged in and use the dashboard. Declining non-essential cookies in our banner limits optional
          analytics only.
        </p>
      </LegalSection>

      <LegalSection title="5. More information">
        <p>
          See our{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>{" "}
          for how we process personal data. Questions:{" "}
          <a href="mailto:privacy@growvisi.in" className="text-primary hover:underline">
            privacy@growvisi.in
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
