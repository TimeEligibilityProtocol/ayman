"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RemoteEditableText } from "@/components/RemoteEditableText";

export function TranslateSection({
  bookId,
  storyId,
  language,
  value,
  label,
  buttonLabel,
  rtl = false,
}: {
  bookId: string;
  storyId: string;
  language: "english" | "arabic";
  value: string;
  label: string;
  buttonLabel: string;
  rtl?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function translate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/stories/${storyId}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Translation failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setLoading(false);
    }
  }

  const endpoint = `/api/books/${bookId}/stories/${storyId}`;
  const field = language === "english" ? "transcriptEnglish" : "transcriptArabic";

  return (
    <section className="mb-6" dir={rtl ? "rtl" : undefined}>
      <h2 className={`text-xs uppercase tracking-wide text-ink-soft mb-2 ${rtl ? "text-right" : ""}`}>{label}</h2>
      {value ? (
        <RemoteEditableText
          endpoint={endpoint}
          field={field}
          value={value}
          multiline
          className={`whitespace-pre-wrap leading-relaxed text-sm ${rtl ? "font-serif text-right" : ""}`}
        />
      ) : (
        <div>
          <button
            onClick={translate}
            disabled={loading}
            className="text-sm text-gold-deep hover:underline disabled:opacity-50"
          >
            {loading ? "Translating…" : buttonLabel}
          </button>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      )}
    </section>
  );
}
