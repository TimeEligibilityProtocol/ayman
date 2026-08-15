"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Intent {
  bookForm: string | null;
  structurePreference: string | null;
  voiceNotes: string[];
  acceptedThemes: string[];
  rejectedThemes: string[];
  titlePreferences: string[];
  hardConstraints: string[];
}

const BOOK_FORMS = ["memoir", "autobiography", "family_history", "collection", "narrative_nonfiction", "hybrid"];
const STRUCTURE_PREFS = ["chronological", "thematic", "cinematic", "mosaic"];

function ListField({
  label,
  placeholder,
  value,
  onSave,
}: {
  label: string;
  placeholder: string;
  value: string[];
  onSave: (lines: string[]) => void;
}) {
  const [text, setText] = useState(value.join("\n"));
  const [saved, setSaved] = useState(true);

  return (
    <div className="mb-4">
      <label className="block text-xs uppercase tracking-wide text-ink-soft mb-1">{label}</label>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        onBlur={() => {
          onSave(text.split("\n").map((l) => l.trim()).filter(Boolean));
          setSaved(true);
        }}
        placeholder={placeholder}
        rows={2}
        className="w-full rounded-lg border border-border bg-cream-soft px-3 py-2 text-sm outline-none focus:border-gold resize-y"
      />
      {!saved && <span className="text-[10px] text-ink-soft/60">unsaved — click away to save</span>}
    </div>
  );
}

export function BookIntentEditor({ bookId, intent }: { bookId: string; intent: Intent }) {
  const router = useRouter();

  async function save(patch: Partial<Intent>) {
    await fetch(`/api/books/${bookId}/intent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-8">
      <h2 className="font-serif text-lg mb-1">The book we're building</h2>
      <p className="text-xs text-ink-soft mb-4">
        This shapes how the Editor writes and structures the book — not just what goes in it.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-ink-soft mb-1">Form</label>
          <select
            value={intent.bookForm || ""}
            onChange={(e) => save({ bookForm: e.target.value })}
            className="w-full rounded-lg border border-border bg-cream-soft px-3 py-2 text-sm outline-none focus:border-gold"
          >
            <option value="">Not set</option>
            {BOOK_FORMS.map((f) => (
              <option key={f} value={f}>
                {f.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-ink-soft mb-1">Structure</label>
          <select
            value={intent.structurePreference || ""}
            onChange={(e) => save({ structurePreference: e.target.value })}
            className="w-full rounded-lg border border-border bg-cream-soft px-3 py-2 text-sm outline-none focus:border-gold"
          >
            <option value="">Not set</option>
            {STRUCTURE_PREFS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ListField
        label="Voice — one instruction per line"
        placeholder={"e.g. Don't make me sound sentimental\nKeep my humour\nI like short chapters"}
        value={intent.voiceNotes}
        onSave={(voiceNotes) => save({ voiceNotes })}
      />
      <ListField
        label="Themes I want kept"
        placeholder="one per line"
        value={intent.acceptedThemes}
        onSave={(acceptedThemes) => save({ acceptedThemes })}
      />
      <ListField
        label="Themes to leave out — the Editor won't build the book around these"
        placeholder="one per line"
        value={intent.rejectedThemes}
        onSave={(rejectedThemes) => save({ rejectedThemes })}
      />
      <ListField
        label="Title ideas I like"
        placeholder="one per line"
        value={intent.titlePreferences}
        onSave={(titlePreferences) => save({ titlePreferences })}
      />
      <ListField
        label="Hard constraints — never violate these"
        placeholder="one per line"
        value={intent.hardConstraints}
        onSave={(hardConstraints) => save({ hardConstraints })}
      />
    </div>
  );
}
