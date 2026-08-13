"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MicIcon } from "@/components/icons";
import { DeleteButton } from "@/components/DeleteButton";

interface Turn {
  id: string;
  role: string;
  text: string;
  createdAt: string;
}
interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}
interface RelatedStory {
  id: string;
  title: string | null;
  createdAt: string;
}

export function EditorTalk({
  bookId,
  initialTurns,
  initialNotes,
}: {
  bookId: string;
  initialTurns: Turn[];
  initialNotes: Note[];
}) {
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [notes] = useState<Note[]>(initialNotes);
  const [related, setRelated] = useState<RelatedStory[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  useEffect(() => {
    fetch(`/api/books/${bookId}/editor/notes/read`, { method: "POST" }).catch(() => {});
  }, [bookId]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    const optimistic: Turn = {
      id: `local-${Date.now()}`,
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    };
    setTurns((t) => [...t, optimistic]);

    try {
      const res = await fetch(`/api/books/${bookId}/editor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTurns((t) => [
        ...t,
        { id: `reply-${Date.now()}`, role: "editor", text: data.reply, createdAt: new Date().toISOString() },
      ]);
      setRelated(data.relatedStories || []);
    } catch {
      setTurns((t) => [
        ...t,
        {
          id: `err-${Date.now()}`,
          role: "editor",
          text: "Sorry — I couldn't respond just now. Try again in a moment.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid md:grid-cols-[240px_1fr_240px] h-full min-h-0">
      {/* Editor's Notes */}
      <aside className="hidden md:block border-r border-border px-5 py-6 overflow-y-auto">
        <div className="text-xs uppercase tracking-wide text-ink-soft mb-3">
          Editor&apos;s Notes {notes.length > 0 && `· ${notes.length} new`}
        </div>
        <div className="space-y-4">
          {notes.map((n) => (
            <div key={n.id} className="text-sm">
              <div className="text-ink font-medium mb-0.5">{n.title}</div>
              <div className="text-ink-soft text-xs leading-relaxed">{n.body}</div>
            </div>
          ))}
          {notes.length === 0 && <p className="text-ink-soft text-xs">Nothing queued right now.</p>}
        </div>
      </aside>

      {/* Conversation */}
      <div className="flex flex-col min-w-0 min-h-0">
        <div className="px-5 md:px-8 pt-6 pb-3 border-b border-border shrink-0 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl">Let&apos;s talk about your story</h1>
            <p className="text-xs text-ink-soft mt-0.5">You speak, I listen. Together we find the story.</p>
          </div>
          {turns.length > 0 && (
            <DeleteButton
              endpoint={`/api/books/${bookId}/editor/chat`}
              label="Clear conversation"
              confirmText="Clear this whole conversation?"
              onDeleted={() => setTurns([])}
              className="shrink-0"
            />
          )}
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 md:px-8 py-5 space-y-4">
          {turns.length === 0 && (
            <p className="text-ink-soft text-sm">Say hello, or tell me what&apos;s on your mind.</p>
          )}
          {turns.map((t) => (
            <div key={t.id} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  t.role === "user" ? "bg-gold-soft/50 text-ink" : "bg-cream-soft border border-border text-ink"
                }`}
              >
                {t.text}
              </div>
            </div>
          ))}
          {sending && <div className="text-xs text-ink-soft">Editor is thinking…</div>}
        </div>

        <div className="px-5 md:px-8 py-4 border-t border-border flex items-center gap-3 shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type or tap the mic to speak…"
            className="flex-1 rounded-full border border-border bg-cream-soft px-4 py-2.5 text-sm outline-none focus:border-gold"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-full bg-gold text-navy flex items-center justify-center disabled:opacity-50"
            aria-label="Send"
          >
            <MicIcon className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Related Stories */}
      <aside className="hidden md:block border-l border-border px-5 py-6 overflow-y-auto">
        <div className="text-xs uppercase tracking-wide text-ink-soft mb-3">Related Stories</div>
        <div className="space-y-3">
          {related.map((s) => (
            <Link
              key={s.id}
              href={`/${bookId}/stories`}
              className="block text-sm text-ink hover:text-gold-deep"
            >
              {s.title || "Untitled story"}
            </Link>
          ))}
          {related.length === 0 && (
            <p className="text-ink-soft text-xs">Related stories will show up here as you talk.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
