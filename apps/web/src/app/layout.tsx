import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { GROWVISI_WEB_URL } from "@growvisi/shared";
import "./globals.css";
import { Providers } from "./providers";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const siteTitle = "Growvisi — AI Revenue Engine for WhatsApp Sales Teams";
const siteDescription =
  "Turn WhatsApp conversations into revenue. Growvisi analyzes intent, scores leads, updates your pipeline, and helps your team close more deals.";

export const metadata: Metadata = {
  metadataBase: new URL(GROWVISI_WEB_URL),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    type: "website",
    url: GROWVISI_WEB_URL,
    siteName: "Growvisi",
    title: siteTitle,
    description: siteDescription,
    locale: "en_IN",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Growvisi — AI Revenue Engine for WhatsApp Sales Teams",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} min-h-screen antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
