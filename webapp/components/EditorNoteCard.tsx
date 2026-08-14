"use client";

import { useState } from "react";
import { SparkleIcon } from "@/components/icons";

interface Note {
  id: string;
  title: string;
  body: string;
  isNew: boolean;
}

export function EditorNoteCard({
  bookId,
  note,
  onResolved,
  dark = true,
}: {
  bookId: string;
  note: Note;
  onResolved: (id: string) => void;
  dark?: boolean;
}) {
  const [busy, setBusy] = useState<"accept" | "dismiss" | null>(null);

  async function resolve(kind: "accepted" | "dismissed") {
    if (busy) return;
    setBusy(kind === "accepted" ? "accept" : "dismiss");
    try {
      const res = await fetch(`/api/books/${bookId}/editor/notes/${note.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onResolved(note.id);
    } catch {
      setBusy(null);
    }
  }

  return (
    <div
      className={`rounded-xl px-4 py-3.5 ${
        dark ? "bg-navy-soft border border-border-navy" : "bg-card border border-border"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className={`flex items-center gap-1.5 text-xs ${dark ? "text-gold-soft" : "text-gold-deep"}`}>
          <SparkleIcon className="w-3.5 h-3.5" />
          {note.title}
        </div>
        {note.isNew && (
          <span className="text-[10px] uppercase tracking-wide bg-gold text-navy rounded-full px-2 py-0.5">
            New
          </span>
        )}
      </div>
      <p className={`text-sm ${dark ? "text-cream/85" : "text-ink"}`}>{note.body}</p>
      <div className="flex items-center gap-4 mt-2.5">
        <button
          onClick={() => resolve("accepted")}
          disabled={!!busy}
          className={`text-xs font-medium disabled:opacity-50 ${
            dark ? "text-gold hover:text-gold-soft" : "text-gold-deep hover:brightness-110"
          }`}
        >
          {busy === "accept" ? "…" : "Accept"}
        </button>
        <button
          onClick={() => resolve("dismissed")}
          disabled={!!busy}
          className={`text-xs disabled:opacity-50 ${
            dark ? "text-cream/50 hover:text-cream/80" : "text-ink-soft hover:text-ink"
          }`}
        >
          {busy === "dismiss" ? "…" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
