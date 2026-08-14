import { NextRequest, NextResponse } from "next/server";
import { getBookBySlugOrNull } from "@/lib/getBook";
import { buildManuscriptDocx } from "@/lib/docxExport";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const buffer = await buildManuscriptDocx(book.id);
  const filename = `${(book.title || book.displayName)}.docx`.replace(/[^a-z0-9.-]+/gi, "-");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
