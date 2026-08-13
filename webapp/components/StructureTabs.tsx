"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RemoteEditableText } from "@/components/RemoteEditableText";
import { DeleteButton } from "@/components/DeleteButton";

interface Thread {
  id: string;
  title: string;
  stories: Array<{ id: string }>;
}
interface Chapter {
  id: string;
  title: string;
  threads: Thread[];
}
interface Part {
  id: string;
  title: string;
  chapters: Chapter[];
}

export function StructureTabs({ bookId, parts }: { bookId: string; parts: Part[] }) {
  const [tab, setTab] = useState<"parts" | "chapters">("parts");
  const router = useRouter();

  const allChapters = parts.flatMap((p) =>
    p.chapters.map((c) => ({ ...c, partTitle: p.title }))
  );

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-cream-soft rounded-full p-1 w-fit">
        {(["parts", "chapters"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize transition ${
              tab === t ? "bg-card shadow-sm text-ink" : "text-ink-soft"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "parts" &&
        parts.map((part, i) => {
          const storyCount = part.chapters.reduce(
            (n, c) => n + c.threads.reduce((m, t) => m + t.stories.length, 0),
            0
          );
          return (
            <div key={part.id} className="mb-6">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-xs uppercase tracking-wide text-ink-soft">Part {i + 1}</div>
                <DeleteButton
                  endpoint={`/api/books/${bookId}/parts/${part.id}`}
                  label="Remove part"
                  confirmText="Remove this part? Its stories stay, just unplaced."
                  onDeleted={() => router.refresh()}
                />
              </div>
              <RemoteEditableText
                endpoint={`/api/books/${bookId}/parts/${part.id}`}
                field="title"
                value={part.title}
                as="div"
                className="font-serif text-lg mb-1"
              />
              <div className="text-xs text-ink-soft mb-3">
                {part.chapters.length} chapters · {storyCount} stories
              </div>
              <div className="space-y-2">
                {part.chapters.map((chapter, ci) => {
                  const chStoryCount = chapter.threads.reduce((m, t) => m + t.stories.length, 0);
                  return (
                    <div key={chapter.id} className="rounded-xl border border-border bg-card px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs text-ink-soft">Chapter {ci + 1}</div>
                        <DeleteButton
                          endpoint={`/api/books/${bookId}/chapters/${chapter.id}`}
                          label="Remove"
                          confirmText="Remove this chapter?"
                          onDeleted={() => router.refresh()}
                        />
                      </div>
                      <RemoteEditableText
                        endpoint={`/api/books/${bookId}/chapters/${chapter.id}`}
                        field="title"
                        value={chapter.title}
                        as="div"
                        className="text-sm text-ink"
                      />
                      <div className="text-xs text-ink-soft mt-0.5">{chStoryCount} stories</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      {tab === "chapters" && (
        <div className="space-y-2">
          {allChapters.map((chapter, i) => {
            const storyCount = chapter.threads.reduce((m, t) => m + t.stories.length, 0);
            return (
              <div key={chapter.id} className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs text-ink-soft">
                    Chapter {i + 1} · {chapter.partTitle}
                  </div>
                  <DeleteButton
                    endpoint={`/api/books/${bookId}/chapters/${chapter.id}`}
                    label="Remove"
                    confirmText="Remove this chapter?"
                    onDeleted={() => router.refresh()}
                  />
                </div>
                <RemoteEditableText
                  endpoint={`/api/books/${bookId}/chapters/${chapter.id}`}
                  field="title"
                  value={chapter.title}
                  as="div"
                  className="text-sm text-ink"
                />
                <div className="text-xs text-ink-soft mt-0.5">{storyCount} stories</div>
              </div>
            );
          })}
        </div>
      )}

      {parts.length === 0 && (
        <p className="text-ink-soft text-sm">
          No structure yet — ask your Editor to look at your stories from the My Book tab.
        </p>
      )}
    </div>
  );
}
