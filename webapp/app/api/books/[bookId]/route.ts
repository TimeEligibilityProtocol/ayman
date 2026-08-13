import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const { title } = (await req.json()) as { title?: string };
  if (typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const updated = await prisma.book.update({ where: { id: book.id }, data: { title } });
  return NextResponse.json({ book: updated });
}
