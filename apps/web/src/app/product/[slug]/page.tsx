import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductLandingPage } from "@/components/marketing/product-landing-page";
import {
  getProductPage,
  PRODUCT_SLUGS,
  type ProductPageSlug,
} from "@/lib/product-pages";
import { buildPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductPage(slug);
  if (!product) return { title: "Product" };
  return buildPageMetadata({
    title: `${product.navLabel} — Growvisi`,
    description: product.subhead,
    path: `/product/${product.slug}`,
    ogTitle: `${product.headline} — Growvisi`,
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductPage(slug);
  if (!product) notFound();

  return <ProductLandingPage slug={slug as ProductPageSlug} />;
}
