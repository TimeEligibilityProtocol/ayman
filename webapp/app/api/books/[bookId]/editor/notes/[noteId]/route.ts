import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";

const VALID_STATUSES = new Set(["pending", "accepted", "dismissed"]);

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ bookId: string; noteId: string }> }) {
  const { bookId, noteId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const body = await req.json();
  const status = body.status;
  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const note = await prisma.editorNote.findUnique({ where: { id: noteId } });
  if (!note || note.bookId !== book.id) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const updated = await prisma.editorNote.update({ where: { id: noteId }, data: { status } });
  return NextResponse.json({ note: updated });
}
