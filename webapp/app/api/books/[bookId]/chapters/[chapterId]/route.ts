import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string; chapterId: string }> }
) {
  const { bookId, chapterId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter || chapter.bookId !== book.id) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const { title } = (await req.json()) as { title?: string };
  if (typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const updated = await prisma.chapter.update({ where: { id: chapterId }, data: { title } });
  return NextResponse.json({ chapter: updated });
}
