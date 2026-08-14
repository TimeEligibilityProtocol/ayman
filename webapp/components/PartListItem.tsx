"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RemoteEditableText } from "@/components/RemoteEditableText";
import { DeleteButton } from "@/components/DeleteButton";

export function PartListItem({
  bookId,
  partId,
  order,
  title,
  locked,
  authorNote,
  chapterCount,
  storyCount,
}: {
  bookId: string;
  partId: string;
  order: number;
  title: string;
  locked: boolean;
  authorNote: string | null;
  chapterCount: number;
  storyCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleLock() {
    setBusy(true);
    try {
      await fetch(`/api/books/${bookId}/parts/${partId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !locked }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`mb-5 ${locked ? "rounded-xl border border-gold-soft bg-gold-soft/10 p-3" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <div className="text-xs uppercase tracking-wide text-ink-soft">Part {order + 1}</div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLock}
            disabled={busy}
            className={`text-xs font-medium disabled:opacity-50 ${
              locked ? "text-gold-deep" : "text-ink-soft hover:text-gold-deep"
            }`}
            title={locked ? "This part is kept as-is when the Editor updates the structure" : "Keep this part when the Editor updates the structure"}
          >
            {locked ? "✓ Keeping this" : "Keep this"}
          </button>
          {!locked && (
            <DeleteButton
              endpoint={`/api/books/${bookId}/parts/${partId}`}
              label="Remove part"
              confirmText="Remove this part? Its stories stay, just unplaced."
              onDeleted={() => router.refresh()}
            />
          )}
        </div>
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
        {locked && " · won't change when you update the structure"}
      </div>
      {locked && (
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-wide text-ink-soft/70 mb-0.5">
            Note for the Editor — guides what comes next
          </div>
          <RemoteEditableText
            endpoint={`/api/books/${bookId}/parts/${partId}`}
            field="authorNote"
            value={authorNote || ""}
            multiline
            as="p"
            className="text-xs text-ink-soft italic"
            placeholder="e.g. keep this tone, or bring in more about..."
          />
        </div>
      )}
    </div>
  );
}
