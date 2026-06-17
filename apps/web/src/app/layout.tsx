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

const siteTitle = "Growvisi — WhatsApp conversation intelligence";
const siteDescription =
  "Track WhatsApp leads end-to-end — ingest customer messages, classify intent, and manage your pipeline while Meta Business Agent handles in-chat replies.";

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
        url: "/growvisi-app-icon-1024.png",
        width: 1024,
        height: 1024,
        alt: "Growvisi — WhatsApp conversation intelligence",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/growvisi-app-icon-1024.png"],
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
