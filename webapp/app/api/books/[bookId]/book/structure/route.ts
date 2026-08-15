import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";
import { proposeBookStructure } from "@/lib/editor";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const parts = await prisma.part.findMany({
    where: { bookId: book.id },
    orderBy: { order: "asc" },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: { threads: { include: { stories: true } } },
      },
    },
  });
  const unplacedStories = await prisma.story.findMany({
    where: { bookId: book.id, threadId: null },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ book, parts, unplacedStories });
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  try {
    const result = await proposeBookStructure(book.id);
    return NextResponse.json({ ...result, ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Structure generation failed" },
      { status: 502 }
    );
  }
}
