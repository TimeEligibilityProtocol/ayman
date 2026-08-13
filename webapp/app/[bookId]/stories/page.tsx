import { prisma } from "@/lib/prisma";
import { getBookBySlug } from "@/lib/getBook";
import { StoryListItem } from "@/components/StoryListItem";
import { isToday, isYesterday, isThisWeek, format } from "date-fns";

function groupLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date, { weekStartsOn: 1 })) return "This week";
  return format(date, "MMMM yyyy");
}

export default async function StoriesPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getBookBySlug(bookId);
  const stories = await prisma.story.findMany({
    where: { bookId: book.id },
    orderBy: { createdAt: "desc" },
  });

  const groups = new Map<string, typeof stories>();
  for (const story of stories) {
    const label = groupLabel(story.createdAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(story);
  }

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 max-w-2xl mx-auto">
      <h1 className="font-serif text-2xl mb-6">My Stories</h1>

      {stories.length === 0 && (
        <p className="text-ink-soft text-sm">
          No stories yet. Head to <span className="font-medium">Tell</span> and record your first one.
        </p>
      )}

      {[...groups.entries()].map(([label, items]) => (
        <div key={label} className="mb-6">
          <div className="text-xs uppercase tracking-wide text-ink-soft mb-1.5">{label}</div>
          <div>
            {items.map((s) => (
              <StoryListItem
                key={s.id}
                href={`/${book.slug}/stories/${s.id}`}
                title={s.title || (s.transcriptOriginal ? "Transcribing…" : "Processing…")}
                timeLabel={
                  s.durationSec
                    ? `${Math.floor(s.durationSec / 60)}:${(s.durationSec % 60).toString().padStart(2, "0")} · ${format(s.createdAt, "d MMM")}`
                    : format(s.createdAt, "HH:mm · d MMM")
                }
                audioUrl={s.audioUrl}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
