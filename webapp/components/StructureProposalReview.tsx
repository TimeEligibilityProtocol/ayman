"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProposalItem {
  id: string;
  partTitle: string;
  chapterTitle: string;
  threads: Array<{ title: string; storyIds: string[] }>;
}

export function StructureProposalReview({
  bookId,
  items,
  storyTitles,
}: {
  bookId: string;
  items: ProposalItem[];
  storyTitles: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null); // itemId being acted on, or "all"

  async function resolve(itemId: string, status: "accepted" | "rejected") {
    setBusy(itemId);
    try {
      await fetch(`/api/books/${bookId}/structure-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function acceptAll() {
    setBusy("all");
    try {
      for (const item of items) {
        await fetch(`/api/books/${bookId}/structure-items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted" }),
        });
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gold-soft bg-gold-soft/10 p-5 mb-8">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="font-serif text-lg">
          Your Editor suggests {items.length} new chapter{items.length === 1 ? "" : "s"}
        </h2>
        <button
          onClick={acceptAll}
          disabled={busy !== null}
          className="shrink-0 text-xs rounded-full bg-gold text-navy px-3 py-1.5 font-medium disabled:opacity-50"
        >
          {busy === "all" ? "Accepting…" : "Accept all"}
        </button>
      </div>
      <p className="text-xs text-ink-soft mb-4">
        Nothing changes until you say so. Accept a chapter to add it to the book, or reject it to leave those
        stories unplaced for now.
      </p>

      <div className="space-y-3">
        {items.map((item) => {
          const storyCount = item.threads.reduce((n, t) => n + t.storyIds.length, 0);
          const titles = item.threads
            .flatMap((t) => t.storyIds)
            .map((id) => storyTitles[id] || "Untitled story");
          return (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-ink font-medium">{item.chapterTitle}</div>
              <div className="text-xs text-ink-soft mb-1">
                in Part &quot;{item.partTitle}&quot; · {storyCount} stor{storyCount === 1 ? "y" : "ies"}
              </div>
              <div className="text-xs text-ink-soft/80 mb-3">{titles.join(", ")}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => resolve(item.id, "accepted")}
                  disabled={busy !== null}
                  className="text-xs rounded-full bg-gold-soft/60 text-gold-deep px-3 py-1.5 font-medium disabled:opacity-50"
                >
                  {busy === item.id ? "…" : "Accept"}
                </button>
                <button
                  onClick={() => resolve(item.id, "rejected")}
                  disabled={busy !== null}
                  className="text-xs rounded-full border border-border px-3 py-1.5 text-ink-soft hover:border-gold disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
