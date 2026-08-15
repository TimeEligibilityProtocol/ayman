import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";

const VALID_STATUSES = new Set(["accepted", "rejected"]);

// Accept and Reject are distinct signals, not both "make it go away": an
// accepted note reinforces the book's direction, a rejected one tells the
// Editor not to build on it — both are real evidence, so neither deletes
// the row. Only the "pending" list (what the author actually sees) filters
// them out; future structure generation can still read rejected notes to
// avoid re-proposing what was already turned down.
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string; noteId: string }> }
) {
  const { bookId, noteId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const note = await prisma.editorNote.findUnique({ where: { id: noteId } });
  if (!note || note.bookId !== book.id) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const { status } = (await req.json()) as { status?: string };
  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "status must be 'accepted' or 'rejected'" }, { status: 400 });
  }

  const updated = await prisma.editorNote.update({ where: { id: noteId }, data: { status } });
  return NextResponse.json({ note: updated });
}
