"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegenerateStructureButton({
  bookId,
  className,
  children,
}: {
  bookId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function run() {
    setLoading(true);
    try {
      await fetch(`/api/books/${bookId}/book/structure`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={run} disabled={loading} className={className}>
      {loading ? "Thinking about your book…" : children}
    </button>
  );
}

export function ExportButton({
  bookId,
  endpoint,
  lang,
  loadingLabel,
  className,
  children,
}: {
  bookId: string;
  endpoint?: "recordings" | "manuscript";
  lang?: "en";
  loadingLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const path =
    (endpoint === "manuscript" ? `/api/books/${bookId}/export/manuscript` : `/api/books/${bookId}/export`) +
    (lang ? `?lang=${lang}` : "");

  // Fetch-and-download instead of a plain <a href> so a slow whole-book
  // translation export can show a loading state instead of just hanging.
  async function download() {
    setLoading(true);
    try {
      const res = await fetch(path);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Export failed");
      }
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : "book.docx";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={download} disabled={loading} className={className}>
      {loading ? loadingLabel || "Preparing…" : children}
    </button>
  );
}
