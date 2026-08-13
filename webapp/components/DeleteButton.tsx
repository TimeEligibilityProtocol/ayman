"use client";

import { useState } from "react";

export function DeleteButton({
  endpoint,
  label = "Delete",
  confirmText = "Delete this? This can't be undone.",
  onDeleted,
  className = "",
}: {
  endpoint: string;
  label?: string;
  confirmText?: string;
  onDeleted: () => void;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="text-ink-soft">{confirmText}</span>
        <button
          onClick={confirmDelete}
          disabled={deleting}
          className="text-red-700 font-medium hover:underline disabled:opacity-50"
        >
          {deleting ? "…" : "Yes, delete"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-ink-soft hover:underline">
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`text-[11px] uppercase tracking-wide text-ink-soft/70 hover:text-red-700 transition ${className}`}
    >
      {label}
    </button>
  );
}
