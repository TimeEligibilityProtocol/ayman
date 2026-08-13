import type { Metadata } from "next";
import { EB_Garamond, Inter, Amiri, Noto_Sans_Arabic } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
});

// Render auto-injects RENDER_EXTERNAL_URL with the service's real public
// URL — use that so link previews (WhatsApp, iMessage, etc.) work without
// needing anyone to hand-set an env var. Falls back to localhost for dev.
const siteUrl = process.env.RENDER_EXTERNAL_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Ayman — Every story matters",
  description: "Tell your story. Your Editor finds the book hidden inside it.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#241e36",
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${ebGaramond.variable} ${inter.variable} ${amiri.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="h-dvh flex flex-col overflow-hidden bg-cream text-ink font-sans">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
