"use client";

import { useEffect, useRef, useState } from "react";

export function EditableText({
  value,
  onSave,
  multiline = false,
  as = "p",
  className = "",
  placeholder = "Empty — click Edit to add text.",
}: {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  multiline?: boolean;
  as?: "p" | "h1" | "h2" | "span" | "div";
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
    }
  }, [editing]);

  async function save() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="w-full">
        {multiline ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.min(20, Math.max(3, Math.ceil(draft.length / 55)))}
            className={`w-full rounded-lg border border-gold bg-cream-soft px-3 py-2 outline-none leading-relaxed ${className}`}
          />
        ) : (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className={`w-full rounded-lg border border-gold bg-cream-soft px-3 py-2 outline-none ${className}`}
          />
        )}
        <div className="flex gap-3 mt-1.5 text-xs">
          <button
            onClick={save}
            disabled={saving}
            className="text-gold-deep font-medium hover:underline disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={cancel} className="text-ink-soft hover:underline">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const Tag = as;
  return (
    <div className="flex items-start gap-2">
      <Tag className={className}>
        {value ? value : <span className="text-ink-soft italic font-sans text-sm">{placeholder}</span>}
      </Tag>
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 mt-1 text-[11px] uppercase tracking-wide text-ink-soft/70 hover:text-gold-deep transition"
      >
        Edit
      </button>
    </div>
  );
}
