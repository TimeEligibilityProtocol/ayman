import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { createElement } from "react";
import { getBookBySlugOrNull } from "@/lib/getBook";

// Manifest icons need real bitmap sizes (192/512) — separate from the
// icon.tsx/apple-icon.tsx route-convention icons, which are fixed sizes
// (32 / 180) meant for browser tabs and Safari's Share sheet, not the
// installed PWA icon most platforms read from the manifest. Plain .ts (no
// JSX) since Route Handlers must be route.ts.
export async function GET(req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  const letter = (book?.displayName || bookId).trim().charAt(0).toUpperCase();

  const size = Number(req.nextUrl.searchParams.get("size")) || 512;

  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#241e36",
        },
      },
      createElement(
        "div",
        { style: { fontSize: size * 0.55, color: "#c39b5c", fontFamily: "Georgia, serif" } },
        letter
      )
    ),
    { width: size, height: size }
  );
}
