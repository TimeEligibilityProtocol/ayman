import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBookBySlug } from "@/lib/getBook";
import { SparkleIcon, EyeIcon } from "@/components/icons";

const KIND_LABEL: Record<string, string> = {
  observation: "An observation",
  pattern: "A pattern I see",
  question: "A question",
};

export default async function EditorPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getBookBySlug(bookId);
  const notes = await prisma.editorNote.findMany({
    where: { bookId: book.id },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const isDark = true; // Editor screen uses the deep navy panel from the mockup

  return (
    <div className={`min-h-full ${isDark ? "bg-navy text-cream" : ""} px-5 md:px-10 py-8 md:py-12`}>
      <div className="max-w-xl mx-auto">
        <h1 className="font-serif text-2xl md:text-3xl mb-2">I&apos;ve been thinking about your stories.</h1>
        <p className="text-cream/60 text-sm mb-8">
          {notes.length > 0
            ? "Here are some thoughts I'd like to explore with you."
            : "Record a few stories and I'll start noticing things worth talking about."}
        </p>

        <div className="space-y-3 mb-8">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl bg-navy-soft border border-border-navy px-4 py-3.5"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-gold-soft">
                  <SparkleIcon className="w-3.5 h-3.5" />
                  {note.title}
                </div>
                {note.isNew && (
                  <span className="text-[10px] uppercase tracking-wide bg-gold text-navy rounded-full px-2 py-0.5">
                    New
                  </span>
                )}
              </div>
              <p className="text-sm text-cream/85">{note.body}</p>
            </div>
          ))}
        </div>

        {notes.length > 3 && (
          <Link
            href={`/${book.slug}/editor/talk`}
            className="flex items-center gap-1.5 text-xs text-cream/50 mb-6 hover:text-cream/80"
          >
            <EyeIcon className="w-3.5 h-3.5" />
            View all notes
          </Link>
        )}

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
