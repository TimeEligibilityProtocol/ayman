import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBookBySlug } from "@/lib/getBook";
import { RegenerateStructureButton, ExportButton } from "@/components/StructureActions";
import { RemoteEditableText } from "@/components/RemoteEditableText";
import { PartListItem } from "@/components/PartListItem";
import { BookIntentEditor } from "@/components/BookIntentEditor";
import { StructureProposalReview } from "@/components/StructureProposalReview";
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
  const intent = (await prisma.bookIntent.findUnique({ where: { bookId: book.id } })) || {
    bookForm: null,
    structurePreference: null,
    voiceNotes: [],
    acceptedThemes: [],
    rejectedThemes: [],
    titlePreferences: [],
    hardConstraints: [],
    acceptedStructureIdeas: [],
    rejectedStructureIdeas: [],
  };

  const pendingItemRows = await prisma.structureProposalItem.findMany({
    where: { status: "pending", proposal: { bookId: book.id } },
    orderBy: { createdAt: "asc" },
  });
  const pendingItems = pendingItemRows.map((item) => ({
    id: item.id,
    partTitle: item.partTitle,
    chapterTitle: item.chapterTitle,
    threads: item.threads as Array<{ title: string; storyIds: string[] }>,
  }));
  const pendingStoryIds = pendingItems.flatMap((item) => item.threads.flatMap((t) => t.storyIds));
  const pendingStories = pendingStoryIds.length
    ? await prisma.story.findMany({ where: { id: { in: pendingStoryIds } }, select: { id: true, title: true } })
    : [];
  const storyTitles = Object.fromEntries(pendingStories.map((s) => [s.id, s.title || "Untitled story"]));

  const chapterCount = parts.reduce((n, p) => n + p.chapters.length, 0);

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-ink-soft mb-1">My Book</div>
          <RemoteEditableText
            endpoint={`/api/books/${book.slug}`}
            field="title"
            value={book.title || ""}
            as="h1"
            className="font-serif text-2xl"
            placeholder="Untitled — ask your Editor, or set one yourself"
          />
        </div>
        {totalStories > 0 && (
          <RegenerateStructureButton
            bookId={book.slug}
            className="shrink-0 text-xs rounded-full border border-border px-3 py-1.5 text-ink-soft hover:border-gold hover:text-gold-deep"
          >
            Update structure
          </RegenerateStructureButton>
        )}
      </div>
      {parts.length > 0 && (
        <p className="text-xs text-ink-soft -mt-4 mb-6">
          &quot;Update structure&quot; only proposes new chapters for unplaced stories — existing chapters are
          never changed. You review and accept each one below before it becomes part of the book.
        </p>
      )}

      <StructureProposalReview bookId={book.slug} items={pendingItems} storyTitles={storyTitles} />

      {totalStories > 0 && <BookIntentEditor bookId={book.slug} intent={intent} />}

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
          <PartListItem
            key={part.id}
            bookId={book.slug}
            partId={part.id}
            order={part.order}
            title={part.title}
            locked={part.locked}
            authorNote={part.authorNote}
            chapterCount={part.chapters.length}
            storyCount={partStories}
          />
        );
      })}

      {unplacedCount > 0 && (
        <div className="mb-5">
          <div className="text-ink font-medium mb-0.5">Unplaced Stories</div>
          <div className="text-xs text-ink-soft">{unplacedCount} stories</div>
        </div>
      )}

      {parts.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          <ExportButton
            bookId={book.slug}
            endpoint="manuscript"
            className="inline-block text-sm rounded-full border border-border px-4 py-2 text-ink hover:border-gold"
          >
            Export book to Word (.docx)
          </ExportButton>
          <ExportButton
            bookId={book.slug}
            endpoint="manuscript"
            lang="en"
            loadingLabel="Translating the whole book…"
            className="inline-block text-sm rounded-full border border-border px-4 py-2 text-ink hover:border-gold"
          >
            Export book in English (.docx)
          </ExportButton>
        </div>
      )}
    </div>
  );
}
