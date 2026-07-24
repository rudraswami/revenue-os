import {
  GROWVISI_EMAIL_SUPPORT,
  GROWVISI_WEB_URL,
  GROWVISI_PLANS,
} from "@growvisi/shared";
import { HOME_FAQ } from "@/lib/brand-copy";
import { POSITIONING } from "@/lib/gtm-copy";
import { DEFAULT_SITE_DESCRIPTION } from "@/lib/seo";

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function HomeStructuredData() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Growvisi",
    url: GROWVISI_WEB_URL,
    logo: `${GROWVISI_WEB_URL}/brand/growvisi-mark.png`,
    description: DEFAULT_SITE_DESCRIPTION,
    email: GROWVISI_EMAIL_SUPPORT,
    areaServed: {
      "@type": "Country",
      name: "India",
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Growvisi",
    url: GROWVISI_WEB_URL,
    description: POSITIONING.oneLiner,
    inLanguage: "en-IN",
  };

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Growvisi",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: GROWVISI_WEB_URL,
    description: POSITIONING.subhead,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      description: POSITIONING.trialNote,
    },
    featureList: [
      "WhatsApp team inbox",
      "AI lead classification",
      "Pipeline and revenue tracking",
      "Human handoff alerts",
      "Morning revenue digest",
    ],
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <>
      <JsonLdScript data={organization} />
      <JsonLdScript data={website} />
      <JsonLdScript data={software} />
      <JsonLdScript data={faq} />
    </>
  );
}

export function PricingStructuredData() {
  const offers = [
    GROWVISI_PLANS.starter,
    GROWVISI_PLANS.growth,
    GROWVISI_PLANS.pro,
  ].map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    price: plan.priceInr,
    priceCurrency: "INR",
    description: plan.description,
    url: `${GROWVISI_WEB_URL}/pricing`,
    availability: "https://schema.org/InStock",
  }));

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Growvisi",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${GROWVISI_WEB_URL}/pricing`,
    description: POSITIONING.subhead,
    offers,
  };

  return <JsonLdScript data={software} />;
}
