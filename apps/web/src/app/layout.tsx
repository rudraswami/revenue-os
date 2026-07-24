import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { GROWVISI_WEB_URL } from "@growvisi/shared";
import "./globals.css";
import { Providers } from "./providers";
import { THEME_NO_FLASH_SCRIPT } from "@/lib/theme";
import {
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  OG_IMAGE_PATH,
  SITE_NAME,
} from "@/lib/seo";

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

export const metadata: Metadata = {
  metadataBase: new URL(GROWVISI_WEB_URL),
  title: {
    default: DEFAULT_SITE_TITLE,
    template: "%s",
  },
  description: DEFAULT_SITE_DESCRIPTION,
  alternates: {
    canonical: GROWVISI_WEB_URL,
  },
  openGraph: {
    type: "website",
    url: GROWVISI_WEB_URL,
    siteName: SITE_NAME,
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    locale: "en_IN",
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: DEFAULT_SITE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
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
  verification: {
    google: "wi_B5CkNTUTdldERWJv-QMmW7V7blwPvdqBfoWqWYwA",
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
