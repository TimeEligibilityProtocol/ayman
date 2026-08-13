"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteStoryButton({ bookId, storyId }: { bookId: string; storyId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${bookId}/stories/${storyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push(`/${bookId}/stories`);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-ink-soft">Delete this recording? This can&apos;t be undone.</span>
        <button
          onClick={confirmDelete}
          disabled={deleting}
          className="text-red-700 font-medium hover:underline disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Yes, delete"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-ink-soft hover:underline">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="text-sm text-ink-soft hover:text-red-700">
      Delete this recording
    </button>
  );
}
