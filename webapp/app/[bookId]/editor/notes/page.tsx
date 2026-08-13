import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBookBySlug } from "@/lib/getBook";
import { BackIcon } from "@/components/icons";
import { EditorNotesList } from "@/components/EditorNotesList";

export default async function EditorNotesPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getBookBySlug(bookId);
  const notes = await prisma.editorNote.findMany({
    where: { bookId: book.id, status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="min-h-full bg-navy text-cream px-5 md:px-10 py-8 md:py-12">
      <div className="max-w-xl mx-auto">
        <Link
          href={`/${book.slug}/editor`}
          className="inline-flex items-center gap-1.5 text-xs text-cream/50 hover:text-cream/80 mb-6"
        >
          <BackIcon className="w-3.5 h-3.5" />
          Back
        </Link>
        <h1 className="font-serif text-2xl md:text-3xl mb-6">All notes</h1>
        <EditorNotesList
          bookId={book.slug}
          initialNotes={notes}
          dark
          emptyMessage="Nothing here — every note has been accepted or dismissed."
        />
      </div>
    </div>
  );
}
