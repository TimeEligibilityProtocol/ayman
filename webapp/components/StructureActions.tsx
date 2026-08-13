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

export function ExportButton({ bookId, className, children }: { bookId: string; className?: string; children: React.ReactNode }) {
  return (
    <a href={`/api/books/${bookId}/export`} className={className}>
      {children}
    </a>
  );
}
