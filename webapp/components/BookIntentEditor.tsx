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
        aria-label="usuń"
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
        {items.length === 0 && <span className="text-xs text-ink-soft/50 italic">jeszcze nic tu nie ma</span>}
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
          placeholder="+ dopisz ręcznie"
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
            placeholder="jeszcze nie ustalone — dopisz albo poczekaj aż ustalicie to w rozmowie"
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
        <h2 className="font-serif text-lg">Co już ustaliliście</h2>
        {saving && <span className="text-[10px] text-ink-soft/60">zapisuję…</span>}
      </div>
      <p className="text-xs text-ink-soft mb-4">
        To wypełnia się samo, kiedy w rozmowie z Edytorem (zakładka Talk) coś potwierdzicie — tytuł, styl,
        temat. Możesz też dopisać coś ręcznie albo usunąć (×), jeśli się nie zgadzasz.
      </p>

      <SingleField
        label="Forma książki"
        hint="np. pamiętnik, historia rodzinna — ustala się, gdy to potwierdzicie w rozmowie"
        value={intent.bookForm}
        onChange={(bookForm) => save({ bookForm: bookForm ?? "" })}
      />
      <SingleField
        label="Układ książki"
        hint="np. chronologicznie, tematycznie — ustala się, gdy to potwierdzicie w rozmowie"
        value={intent.structurePreference}
        onChange={(structurePreference) => save({ structurePreference: structurePreference ?? "" })}
      />
      <ListGroup
        label="Tytuły, które się podobają"
        hint="propozycje, które zaakceptowaliście w rozmowie"
        items={intent.titlePreferences}
        onChange={(titlePreferences) => save({ titlePreferences })}
      />
      <ListGroup
        label="Styl / głos"
        hint="jak Edytor ma pisać — np. „nie pisz smutno”, „krótkie rozdziały”"
        items={intent.voiceNotes}
        onChange={(voiceNotes) => save({ voiceNotes })}
      />
      <ListGroup
        label="Tematy do zachowania"
        hint="rzeczy, które na pewno mają być w książce"
        items={intent.acceptedThemes}
        onChange={(acceptedThemes) => save({ acceptedThemes })}
      />
      <ListGroup
        label="Tematy do pominięcia"
        hint="Edytor nie będzie tego wplatał do książki"
        items={intent.rejectedThemes}
        onChange={(rejectedThemes) => save({ rejectedThemes })}
      />
      <ListGroup
        label="Twarde zasady"
        hint="rzeczy, których Edytor nigdy nie może złamać"
        items={intent.hardConstraints}
        onChange={(hardConstraints) => save({ hardConstraints })}
      />
    </div>
  );
}
