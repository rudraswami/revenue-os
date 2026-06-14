import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main className="py-12 md:py-16">
        <article className="mx-auto max-w-[720px] px-6">
          <p className="text-[13px] font-medium text-primary">Legal</p>
          <h1 className="display-lg mt-2 text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          <div className="prose-legal mt-10">{children}</div>
          <p className="mt-12 border-t border-border pt-8 text-sm text-muted-foreground">
            Questions?{" "}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              Contact us
            </Link>{" "}
            or email{" "}
            <a href="mailto:privacy@growvisi.in" className="font-medium text-primary hover:underline">
              privacy@growvisi.in
            </a>
            .
          </p>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
