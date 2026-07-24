import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SolutionLandingPage } from "@/components/marketing/solution-landing-page";
import {
  getSolutionPage,
  SOLUTION_SLUGS,
  type SolutionPageSlug,
} from "@/lib/solution-pages";
import { buildPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SOLUTION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const solution = getSolutionPage(slug);
  if (!solution) return { title: "Solutions" };
  return buildPageMetadata({
    title: `${solution.navLabel} — Growvisi WhatsApp revenue OS`,
    description: solution.subhead,
    path: `/solutions/${solution.slug}`,
    ogTitle: solution.headline,
  });
}

export default async function SolutionPage({ params }: Props) {
  const { slug } = await params;
  const solution = getSolutionPage(slug);
  if (!solution) notFound();

  return <SolutionLandingPage slug={slug as SolutionPageSlug} />;
}
