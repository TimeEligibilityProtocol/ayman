import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const notes = await prisma.editorNote.findMany({
    where: { bookId: book.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { story: { select: { title: true } } },
  });
  return NextResponse.json({ notes });
}
