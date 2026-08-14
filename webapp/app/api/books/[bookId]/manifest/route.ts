import { NextRequest, NextResponse } from "next/server";
import { getBookBySlugOrNull } from "@/lib/getBook";

// Per-panel PWA manifest. The single static /manifest.json previously
// controlled every panel's "Add to Home Screen" name AND start_url —
// meaning every install showed "Ayman" and launched into Ayman's book
// regardless of which panel it was installed from. Each panel now gets
// its own manifest, generated from that panel's own displayName/slug.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  const displayName = book?.displayName || bookId;

  // Relative paths on purpose — manifest icon URLs resolve against the
  // manifest's own URL, so there's no need (and, behind Render's proxy, no
  // reliable way) to build an absolute origin. req.nextUrl.origin reported
  // Render's internal "https://localhost:10000" instead of the real public
  // domain, which silently broke installability (unreachable icon URLs).
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
      { src: `/api/books/${bookId}/pwa-icon?size=192`, sizes: "192x192", type: "image/png" },
      {
        src: `/api/books/${bookId}/pwa-icon?size=512`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  return NextResponse.json(manifest, { headers: { "Content-Type": "application/manifest+json" } });
}
