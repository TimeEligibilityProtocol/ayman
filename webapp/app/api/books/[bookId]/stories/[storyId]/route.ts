import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";

const EDITABLE_FIELDS = [
  "title",
  "transcriptOriginal",
  "transcriptEnglish",
  "transcriptArabic",
  "approvedText",
] as const;

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string; storyId: string }> }
) {
  const { bookId, storyId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story || story.bookId !== book.id) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, string> = {};
  for (const field of EDITABLE_FIELDS) {
    if (typeof body[field] === "string") data[field] = body[field] as string;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const updated = await prisma.story.update({ where: { id: storyId }, data });
  return NextResponse.json({ story: updated });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ bookId: string; storyId: string }> }
) {
  const { bookId, storyId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story || story.bookId !== book.id) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  // Keep conversation/editor-note history readable, just detach the deleted story.
  await prisma.editorNote.updateMany({ where: { storyId }, data: { storyId: null } });
  await prisma.conversationTurn.updateMany({ where: { storyId }, data: { storyId: null } });
  await prisma.story.delete({ where: { id: storyId } });

  if (story.audioUrl) {
    const filePath = path.join(process.cwd(), "public", story.audioUrl);
    await fs.unlink(filePath).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
