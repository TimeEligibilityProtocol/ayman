import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBookBySlug } from "@/lib/getBook";
import { RegenerateStructureButton, ExportButton } from "@/components/StructureActions";
import { BookIcon } from "@/components/icons";

export default async function MyBookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getBookBySlug(bookId);

  const parts = await prisma.part.findMany({
    where: { bookId: book.id },
    orderBy: { order: "asc" },
    include: { chapters: { include: { threads: { include: { stories: true } } } } },
  });
  const unplacedCount = await prisma.story.count({ where: { bookId: book.id, threadId: null } });
  const totalStories = await prisma.story.count({ where: { bookId: book.id } });

  const chapterCount = parts.reduce((n, p) => n + p.chapters.length, 0);

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl">My Book</h1>
        <RegenerateStructureButton
          bookId={book.slug}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-ink-soft hover:border-gold hover:text-gold-deep"
        >
          +
        </RegenerateStructureButton>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="font-serif text-lg mb-1">
            {totalStories === 0 ? "Your book is waiting to begin" : "Your book is taking shape"}
          </div>
          <p className="text-sm text-ink-soft mb-3">
            {parts.length > 0
              ? `We've found ${parts.length} part${parts.length === 1 ? "" : "s"} and ${chapterCount} chapter${chapterCount === 1 ? "" : "s"} so far.`
              : `${totalStories} ${totalStories === 1 ? "story" : "stories"} recorded. Ask your Editor to see the shape of the book.`}
          </p>
          <Link
            href={`/${book.slug}/book/structure`}
            className="inline-block text-sm rounded-full bg-gold-soft/60 text-gold-deep px-4 py-1.5 font-medium hover:bg-gold-soft"
          >
            See structure
          </Link>
        </div>
        <BookIcon className="w-12 h-12 text-gold shrink-0" />
      </div>

      {parts.map((part) => {
        const partStories = part.chapters.reduce((n, c) => n + c.threads.reduce((m, t) => m + t.stories.length, 0), 0);
        return (
          <div key={part.id} className="mb-5">
            <div className="text-xs uppercase tracking-wide text-ink-soft mb-1">
              Part {part.order + 1}
            </div>
            <div className="text-ink font-medium mb-0.5">{part.title}</div>
            <div className="text-xs text-ink-soft">
              {part.chapters.length} chapter{part.chapters.length === 1 ? "" : "s"} · {partStories} stories
            </div>
          </div>
        );
      })}

      {unplacedCount > 0 && (
        <div className="mb-5">
          <div className="text-ink font-medium mb-0.5">Unplaced Stories</div>
          <div className="text-xs text-ink-soft">{unplacedCount} stories</div>
        </div>
      )}

      {totalStories > 0 && (
        <ExportButton
          bookId={book.slug}
          className="mt-6 inline-block text-sm rounded-full border border-border px-4 py-2 text-ink hover:border-gold"
        >
          Export to Word (.docx)
        </ExportButton>
      )}
    </div>
  );
}
