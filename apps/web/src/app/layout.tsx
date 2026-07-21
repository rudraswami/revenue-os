import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { GROWVISI_WEB_URL } from "@growvisi/shared";
import "./globals.css";
import { Providers } from "./providers";
import { THEME_NO_FLASH_SCRIPT } from "@/lib/theme";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const siteTitle = "Growvisi — Always know whose turn it is on WhatsApp";
const siteDescription =
  "WhatsApp conversations in. Pipeline ₹ out. AI classifies every lead — YOUR TURN when a human should reply. 14-day trial, INR via Razorpay.";

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
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: siteTitle }],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/opengraph-image"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/brand/growvisi-mark.png", type: "image/png" }],
    apple: [{ url: "/brand/growvisi-mark.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Growvisi",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b9e6d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH_SCRIPT }} />
      </head>
      <body className={`${jakarta.variable} ${inter.variable} min-h-screen antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
