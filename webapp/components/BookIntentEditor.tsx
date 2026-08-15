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

function Chip({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-soft border border-border px-3 py-1 text-xs">
      {text}
      <button
        type="button"
        onClick={onRemove}
        aria-label="remove"
        className="text-ink-soft hover:text-red-600 leading-none"
      >
        ×
      </button>
    </span>
  );
}

function ListGroup({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  }

  return (
    <div className="mb-5">
      <div className="text-xs uppercase tracking-wide text-ink-soft mb-1">{label}</div>
      <p className="text-[11px] text-ink-soft/70 mb-2">{hint}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item, i) => (
          <Chip key={`${item}-${i}`} text={item} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
        ))}
        {items.length === 0 && <span className="text-xs text-ink-soft/50 italic">nothing here yet</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="+ add manually"
          className="flex-1 text-xs rounded-lg border border-border bg-cream-soft px-3 py-1.5 outline-none focus:border-gold"
        />
      </div>
    </div>
  );
}

function SingleField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="mb-5">
      <div className="text-xs uppercase tracking-wide text-ink-soft mb-1">{label}</div>
      <p className="text-[11px] text-ink-soft/70 mb-2">{hint}</p>
      {value ? (
        <Chip text={value} onRemove={() => onChange(null)} />
      ) : (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (draft.trim()) {
                  onChange(draft.trim());
                  setDraft("");
                }
              }
            }}
            placeholder="not set yet — add one, or wait until you agree on it in conversation"
            className="flex-1 text-xs rounded-lg border border-border bg-cream-soft px-3 py-1.5 outline-none focus:border-gold"
          />
        </div>
      )}
    </div>
  );
}

export function BookIntentEditor({ bookId, intent }: { bookId: string; intent: Intent }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function save(patch: Partial<Intent>) {
    setSaving(true);
    await fetch(`/api/books/${bookId}/intent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-serif text-lg">What we&apos;ve established</h2>
        {saving && <span className="text-[10px] text-ink-soft/60">saving…</span>}
      </div>
      <p className="text-xs text-ink-soft mb-4">
        This fills in on its own when you agree on something with your Editor in the Talk tab — a title, a
        style, a theme. You can also add something yourself, or remove it (×) if you disagree.
      </p>

      <SingleField
        label="Book form"
        hint="e.g. memoir, family history — set once you confirm it in conversation"
        value={intent.bookForm}
        onChange={(bookForm) => save({ bookForm: bookForm ?? "" })}
      />
      <SingleField
        label="Structure"
        hint="e.g. chronological, thematic — set once you confirm it in conversation"
        value={intent.structurePreference}
        onChange={(structurePreference) => save({ structurePreference: structurePreference ?? "" })}
      />
      <ListGroup
        label="Titles you like"
        hint="suggestions you've agreed on in conversation"
        items={intent.titlePreferences}
        onChange={(titlePreferences) => save({ titlePreferences })}
      />
      <ListGroup
        label="Voice / style"
        hint={`how the Editor should write — e.g. "don't write it sad", "short chapters"`}
        items={intent.voiceNotes}
        onChange={(voiceNotes) => save({ voiceNotes })}
      />
      <ListGroup
        label="Themes to keep"
        hint="things that should definitely be in the book"
        items={intent.acceptedThemes}
        onChange={(acceptedThemes) => save({ acceptedThemes })}
      />
      <ListGroup
        label="Themes to leave out"
        hint="the Editor won't build the book around these"
        items={intent.rejectedThemes}
        onChange={(rejectedThemes) => save({ rejectedThemes })}
      />
      <ListGroup
        label="Hard constraints"
        hint="things the Editor must never break"
        items={intent.hardConstraints}
        onChange={(hardConstraints) => save({ hardConstraints })}
      />
    </div>
  );
}
