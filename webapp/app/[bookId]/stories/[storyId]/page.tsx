import { prisma } from "@/lib/prisma";
import { getBookBySlug } from "@/lib/getBook";
import { StoryDecision } from "@/components/StoryDecision";
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

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 max-w-2xl mx-auto">
      <div className="text-xs text-ink-soft mb-1">{format(story.createdAt, "d MMMM yyyy, HH:mm")}</div>
      <h1 className="font-serif text-2xl mb-5">{story.title || "Untitled story"}</h1>

      {story.audioUrl && (
        <audio controls src={story.audioUrl} className="w-full mb-6" />
      )}

      <div className="mb-6">
        <StoryDecision bookId={book.slug} storyId={story.id} currentState={story.approvalState} />
      </div>

      {story.approvedText && story.approvalState === "approved" && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-wide text-ink-soft mb-2">Approved Story</h2>
          <p className="whitespace-pre-wrap leading-relaxed font-serif text-[17px]">{story.approvedText}</p>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-wide text-ink-soft mb-2">Original transcript</h2>
        <p className="whitespace-pre-wrap leading-relaxed text-ink-soft text-sm">
          {story.transcriptOriginal || "Still transcribing…"}
        </p>
      </section>

      {story.transcriptEnglish && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-wide text-ink-soft mb-2">English</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-sm">{story.transcriptEnglish}</p>
        </section>
      )}

      {story.transcriptArabic && (
        <section className="mb-6" dir="rtl">
          <h2 className="text-xs uppercase tracking-wide text-ink-soft mb-2 text-right">العربية</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-sm font-serif text-right">
            {story.transcriptArabic}
          </p>
        </section>
      )}
    </div>
  );
}
