import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";

// Accept and Dismiss both permanently delete the note — consistent with
// how Stories and conversation turns are removed elsewhere in the app.
// Nothing reads a resolved note's status afterward, so there's no reason
// to keep a "dismissed"/"accepted" row sitting in the database.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ bookId: string; noteId: string }> }) {
  const { bookId, noteId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const note = await prisma.editorNote.findUnique({ where: { id: noteId } });
  if (!note || note.bookId !== book.id) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  await prisma.editorNote.delete({ where: { id: noteId } });
  return NextResponse.json({ ok: true });
}
