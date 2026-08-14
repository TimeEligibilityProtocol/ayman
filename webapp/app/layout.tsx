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

// NEXT_PUBLIC_SITE_URL wins when set — it's the real custom domain once one
// is connected. Render auto-injects RENDER_EXTERNAL_URL with the .onrender.com
// URL as a fallback, so link previews still work before a custom domain exists.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";

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
