import { NextRequest, NextResponse } from "next/server";
import { getBookBySlugOrNull } from "@/lib/getBook";

// Per-panel PWA manifest. The single static /manifest.json previously
// controlled every panel's "Add to Home Screen" name AND start_url —
// meaning every install showed "Ayman" and launched into Ayman's book
// regardless of which panel it was installed from. Each panel now gets
// its own manifest, generated from that panel's own displayName/slug.
export async function GET(req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  const displayName = book?.displayName || bookId;
  const origin = req.nextUrl.origin;

  const manifest = {
    name: `${displayName} — Every story matters`,
    short_name: displayName,
    description: "Tell your story. Your Editor finds the book hidden inside it.",
    start_url: `/${bookId}/tell`,
    scope: `/${bookId}/`,
    display: "standalone",
    background_color: "#f7f1e6",
    theme_color: "#241e36",
    icons: [
      { src: `${origin}/api/books/${bookId}/pwa-icon?size=192`, sizes: "192x192", type: "image/png" },
      {
        src: `${origin}/api/books/${bookId}/pwa-icon?size=512`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  return NextResponse.json(manifest, { headers: { "Content-Type": "application/manifest+json" } });
}
