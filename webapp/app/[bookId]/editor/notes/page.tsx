import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBookBySlug } from "@/lib/getBook";
import { EditorNotesList } from "@/components/EditorNotesList";

export default async function EditorNotesPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getBookBySlug(bookId);
  const notes = await prisma.editorNote.findMany({
    where: { bookId: book.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="min-h-full bg-navy text-cream px-5 md:px-10 py-8 md:py-12">
      <div className="max-w-xl mx-auto">
        <h1 className="font-serif text-2xl md:text-3xl mb-2">I&apos;ve been thinking about your stories.</h1>
        <p className="text-cream/60 text-sm mb-8">
          {notes.length > 0
            ? "Here are some thoughts I'd like to explore with you."
            : "Record a few stories and I'll start noticing things worth talking about."}
        </p>

        <div className="mb-8">
          <EditorNotesList
            bookId={book.slug}
            initialNotes={notes}
            dark
            emptyMessage="Nothing queued right now."
          />
        </div>

        <Link
          href={`/${book.slug}/editor/talk`}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-gold text-navy font-medium py-3.5 hover:brightness-105 transition"
        >
          Let&apos;s talk
        </Link>
      </div>
    </div>
  );
}
