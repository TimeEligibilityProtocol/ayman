"use client";

import { useState } from "react";
import { EditorNoteCard } from "@/components/EditorNoteCard";

interface Note {
  id: string;
  title: string;
  body: string;
  isNew: boolean;
}

export function EditorNotesList({
  bookId,
  initialNotes,
  dark = true,
  emptyMessage,
}: {
  bookId: string;
  initialNotes: Note[];
  dark?: boolean;
  emptyMessage: string;
}) {
  const [notes, setNotes] = useState(initialNotes);

  if (notes.length === 0) {
    return <p className={`text-sm ${dark ? "text-cream/60" : "text-ink-soft"}`}>{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <EditorNoteCard
          key={note.id}
          bookId={bookId}
          note={note}
          dark={dark}
          onResolved={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
        />
      ))}
    </div>
  );
}
