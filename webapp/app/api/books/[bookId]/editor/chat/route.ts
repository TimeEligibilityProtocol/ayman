import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";
import { chatWithEditor } from "@/lib/editor";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const turns = await prisma.conversationTurn.findMany({
    where: { bookId: book.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ turns });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const { message } = (await req.json()) as { message: string };
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Message is empty" }, { status: 400 });
  }

  try {
    const result = await chatWithEditor(book.id, message.trim());
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Editor chat failed" },
      { status: 502 }
    );
  }
}
