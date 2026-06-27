import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductLandingPage } from "@/components/marketing/product-landing-page";
import {
  getProductPage,
  PRODUCT_PAGES,
  PRODUCT_SLUGS,
  type ProductPageSlug,
} from "@/lib/product-pages";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductPage(slug);
  if (!product) return { title: "Product" };
  return {
    title: `${product.navLabel} — Growvisi`,
    description: product.subhead,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductPage(slug);
  if (!product) notFound();

  const siblings = PRODUCT_SLUGS.map((s) => PRODUCT_PAGES[s as ProductPageSlug]);

  return <ProductLandingPage product={product} siblings={siblings} />;
}
