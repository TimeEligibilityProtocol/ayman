"use client";

import { useRouter } from "next/navigation";
import { RemoteEditableText } from "@/components/RemoteEditableText";
import { DeleteButton } from "@/components/DeleteButton";

export function PartListItem({
  bookId,
  partId,
  order,
  title,
  chapterCount,
  storyCount,
}: {
  bookId: string;
  partId: string;
  order: number;
  title: string;
  chapterCount: number;
  storyCount: number;
}) {
  const router = useRouter();

  return (
    <div className="mb-5">
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <div className="text-xs uppercase tracking-wide text-ink-soft">Part {order + 1}</div>
        <DeleteButton
          endpoint={`/api/books/${bookId}/parts/${partId}`}
          label="Remove part"
          confirmText="Remove this part? Its stories stay, just unplaced."
          onDeleted={() => router.refresh()}
        />
      </div>
      <RemoteEditableText
        endpoint={`/api/books/${bookId}/parts/${partId}`}
        field="title"
        value={title}
        as="div"
        className="text-ink font-medium"
      />
      <div className="text-xs text-ink-soft">
        {chapterCount} chapter{chapterCount === 1 ? "" : "s"} · {storyCount} stories
      </div>
    </div>
  );
}
