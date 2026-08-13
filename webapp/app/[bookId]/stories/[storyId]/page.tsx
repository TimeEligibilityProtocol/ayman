import { prisma } from "@/lib/prisma";
import { getBookBySlug } from "@/lib/getBook";
import { StoryDecision } from "@/components/StoryDecision";
import { DeleteStoryButton } from "@/components/DeleteStoryButton";
import { RemoteEditableText } from "@/components/RemoteEditableText";
import { notFound } from "next/navigation";
import { format } from "date-fns";

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ bookId: string; storyId: string }>;
}) {
  const { bookId, storyId } = await params;
  const book = await getBookBySlug(bookId);
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story || story.bookId !== book.id) notFound();

  const endpoint = `/api/books/${book.slug}/stories/${story.id}`;

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 max-w-2xl mx-auto">
      <div className="text-xs text-ink-soft mb-1">{format(story.createdAt, "d MMMM yyyy, HH:mm")}</div>
      <div className="mb-5">
        <RemoteEditableText
          endpoint={endpoint}
          field="title"
          value={story.title || ""}
          as="h1"
          className="font-serif text-2xl"
          placeholder="Untitled story"
        />
      </div>

      {story.audioUrl && (
        <audio controls src={story.audioUrl} className="w-full mb-6" />
      )}

      <div className="mb-6">
        <StoryDecision bookId={book.slug} storyId={story.id} currentState={story.approvalState} />
      </div>

      {story.approvalState === "approved" && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-wide text-ink-soft mb-2">Approved Story</h2>
          <RemoteEditableText
            endpoint={endpoint}
            field="approvedText"
            value={story.approvedText || ""}
            multiline
            className="whitespace-pre-wrap leading-relaxed font-serif text-[17px]"
          />
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-wide text-ink-soft mb-2">Original transcript</h2>
        <RemoteEditableText
          endpoint={endpoint}
          field="transcriptOriginal"
          value={story.transcriptOriginal || ""}
          multiline
          className="whitespace-pre-wrap leading-relaxed text-ink-soft text-sm"
          placeholder="Still transcribing…"
        />
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-wide text-ink-soft mb-2">English</h2>
        <RemoteEditableText
          endpoint={endpoint}
          field="transcriptEnglish"
          value={story.transcriptEnglish || ""}
          multiline
          className="whitespace-pre-wrap leading-relaxed text-sm"
          placeholder="No English translation yet."
        />
      </section>

      <section className="mb-6" dir="rtl">
        <h2 className="text-xs uppercase tracking-wide text-ink-soft mb-2 text-right">العربية</h2>
        <RemoteEditableText
          endpoint={endpoint}
          field="transcriptArabic"
          value={story.transcriptArabic || ""}
          multiline
          className="whitespace-pre-wrap leading-relaxed text-sm font-serif text-right"
          placeholder="لا توجد ترجمة عربية بعد."
        />
      </section>

      <div className="pt-4 border-t border-border">
        <DeleteStoryButton bookId={book.slug} storyId={story.id} />
      </div>
    </div>
  );
}
