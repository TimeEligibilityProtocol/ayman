import { NextRequest, NextResponse } from "next/server";
import { getBookBySlugOrNull } from "@/lib/getBook";
import { buildManuscriptDocx } from "@/lib/docxExport";

export async function GET(req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const english = req.nextUrl.searchParams.get("lang") === "en";

  let buffer: Buffer;
  try {
    buffer = await buildManuscriptDocx(book.id, english);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 502 }
    );
  }
  const suffix = english ? "-english" : "";
  const filename = `${(book.title || book.displayName)}${suffix}.docx`.replace(/[^a-z0-9.-]+/gi, "-");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
