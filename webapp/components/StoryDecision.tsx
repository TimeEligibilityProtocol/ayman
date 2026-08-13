"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  { key: "approved", label: "Yes, that's it" },
  { key: "exploring", label: "Let's explore this" },
  { key: "not_quite", label: "Not quite" },
  { key: "deferred", label: "Leave it for later" },
] as const;

export function StoryDecision({
  bookId,
  storyId,
  currentState,
}: {
  bookId: string;
  storyId: string;
  currentState: string;
}) {
  const [state, setState] = useState(currentState);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function choose(decision: string) {
    setLoading(decision);
    try {
      const res = await fetch(`/api/books/${bookId}/stories/${storyId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error();
      setState(decision);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => choose(opt.key)}
            disabled={loading !== null}
            className={`text-sm rounded-full px-4 py-2 border transition ${
              state === opt.key
                ? "bg-navy text-cream border-navy"
                : "border-border text-ink hover:border-gold"
            } disabled:opacity-50`}
          >
            {loading === opt.key ? "…" : opt.label}
          </button>
        ))}
      </div>
      {state === "approved" && (
        <p className="text-xs text-ink-soft mt-2">
          Added to your Working Manuscript. Your original recording is never changed.
        </p>
      )}
    </div>
  );
}
