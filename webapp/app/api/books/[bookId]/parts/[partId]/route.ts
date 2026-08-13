import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string; partId: string }> }
) {
  const { bookId, partId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!part || part.bookId !== book.id) {
    return NextResponse.json({ error: "Part not found" }, { status: 404 });
  }

  const { title } = (await req.json()) as { title?: string };
  if (typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const updated = await prisma.part.update({ where: { id: partId }, data: { title } });
  return NextResponse.json({ part: updated });
}
