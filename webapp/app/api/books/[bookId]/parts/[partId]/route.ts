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

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string; partId: string }> }
) {
  const { bookId, partId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const part = await prisma.part.findUnique({ where: { id: partId }, include: { chapters: true } });
  if (!part || part.bookId !== book.id) {
    return NextResponse.json({ error: "Part not found" }, { status: 404 });
  }

  const chapterIds = part.chapters.map((c) => c.id);
  const threads = await prisma.thread.findMany({ where: { chapterId: { in: chapterIds } } });
  const threadIds = threads.map((t) => t.id);

  // Stories/threads themselves are never deleted — only detached, so no
  // content is lost when a Part/Chapter is removed from the structure.
  await prisma.story.updateMany({ where: { threadId: { in: threadIds } }, data: { threadId: null } });
  await prisma.thread.deleteMany({ where: { chapterId: { in: chapterIds } } });
  await prisma.chapter.deleteMany({ where: { partId } });
  await prisma.part.delete({ where: { id: partId } });

  return NextResponse.json({ ok: true });
}
