// Ported from the terminal prototype (editor.py). Same tool shape, same
// merge semantics — this is the validated architecture, now updating a
// StoryMemory DB row instead of a JSON file.

export const RECORD_MEMORY_TOOL = {
  name: "record_memory_update",
  description:
    "Record ONLY what is new or changed this turn in the Story Memory. Omit any field with nothing new. Never invent entries not grounded in what the user actually said.",
  input_schema: {
    type: "object" as const,
    properties: {
      people: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            notes: { type: "string" },
          },
        },
      },
      relationships: {
        type: "array",
        items: {
          type: "object",
          properties: {
            between: { type: "array", items: { type: "string" } },
            description: { type: "string" },
          },
        },
      },
      timeline: {
        type: "array",
        items: {
          type: "object",
          properties: {
            period: { type: "string" },
            event: { type: "string" },
            significance: { type: "string" },
          },
        },
      },
      places: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" }, context: { type: "string" } },
        },
      },
      themes: {
        type: "array",
        items: {
          type: "object",
          properties: { theme: { type: "string" }, evidence: { type: "string" } },
        },
      },
      recurring_images: { type: "array", items: { type: "string" } },
      key_events: { type: "array", items: { type: "string" } },
      contradictions: {
        type: "array",
        items: {
          type: "object",
          properties: { description: { type: "string" }, related_to: { type: "string" } },
        },
      },
      emotional_turning_points: { type: "array", items: { type: "string" } },
      open_threads_new: {
        type: "array",
        items: {
          type: "object",
          properties: { topic: { type: "string" }, note: { type: "string" } },
        },
      },
      open_threads_resolved: {
        type: "array",
        items: { type: "string" },
        description: "Topic strings of previously open threads that are now resolved.",
      },
      possible_scenes: { type: "array", items: { type: "string" } },
      possible_chapters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            stories: { type: "array", items: { type: "string" } },
          },
        },
      },
      unresolved_questions: { type: "array", items: { type: "string" } },
      important_quotes: {
        type: "array",
        items: {
          type: "object",
          properties: { text: { type: "string" }, context: { type: "string" } },
        },
      },
      facts_needing_confirmation: { type: "array", items: { type: "string" } },
      editorial_insights: { type: "array", items: { type: "string" } },
      author_voice: {
        type: "object",
        properties: {
          tone: { type: "string" },
          rhythm: { type: "string" },
          recurring_phrases: { type: "array", items: { type: "string" } },
          style_notes: { type: "array", items: { type: "string" } },
        },
      },
      structure_hypotheses: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            confidence: { type: "number" },
            reason: { type: "string" },
          },
        },
      },
      book_title_suggestion: {
        type: "string",
        description: "Only set once there is enough material to genuinely propose a title.",
      },
    },
  },
};

export interface StoryMemoryData {
  people?: Array<Record<string, unknown>>;
  relationships?: Array<Record<string, unknown>>;
  timeline?: Array<Record<string, unknown>>;
  places?: Array<Record<string, unknown>>;
  themes?: Array<Record<string, unknown>>;
  recurring_images?: string[];
  key_events?: string[];
  contradictions?: Array<Record<string, unknown>>;
  emotional_turning_points?: string[];
  open_threads?: Array<{ topic: string; note?: string; resolved: boolean }>;
  possible_scenes?: string[];
  possible_chapters?: Array<Record<string, unknown>>;
  unresolved_questions?: string[];
  important_quotes?: Array<Record<string, unknown>>;
  facts_needing_confirmation?: string[];
  editorial_insights?: string[];
  author_voice?: {
    tone?: string;
    rhythm?: string;
    recurring_phrases?: string[];
    style_notes?: string[];
  };
  structure_hypotheses?: Array<{ type: string; confidence: number; reason?: string }>;
  [key: string]: unknown;
}

const LIST_FIELDS = [
  "people", "relationships", "timeline", "places", "themes",
  "recurring_images", "key_events", "contradictions",
  "emotional_turning_points", "possible_scenes", "possible_chapters",
  "unresolved_questions", "important_quotes",
  "facts_needing_confirmation", "editorial_insights",
] as const;

export interface MemoryUpdate {
  [key: string]: unknown;
  open_threads_new?: Array<{ topic: string; note?: string }>;
  open_threads_resolved?: string[];
  author_voice?: { tone?: string; rhythm?: string; recurring_phrases?: string[]; style_notes?: string[] };
  structure_hypotheses?: Array<{ type: string; confidence: number; reason?: string }>;
  book_title_suggestion?: string;
}

export function mergeMemory(memory: StoryMemoryData, update: MemoryUpdate): StoryMemoryData {
  const next: StoryMemoryData = { ...memory };

  for (const field of LIST_FIELDS) {
    const incoming = update[field];
    if (Array.isArray(incoming) && incoming.length > 0) {
      const existing = Array.isArray(next[field]) ? (next[field] as unknown[]) : [];
      next[field] = [...existing, ...incoming];
    }
  }

  if (Array.isArray(update.open_threads_new) && update.open_threads_new.length > 0) {
    const existing = Array.isArray(next.open_threads) ? next.open_threads : [];
    next.open_threads = [
      ...existing,
      ...update.open_threads_new
        .filter((t) => t && typeof t === "object" && typeof t.topic === "string")
        .map((t) => ({ topic: t.topic, note: t.note || "", resolved: false })),
    ];
  }

  if (Array.isArray(update.open_threads_resolved) && update.open_threads_resolved.length > 0) {
    const resolvedSet = new Set(
      update.open_threads_resolved.filter((t) => typeof t === "string").map((t) => t.trim().toLowerCase())
    );
    next.open_threads = (Array.isArray(next.open_threads) ? next.open_threads : []).map((t) =>
      resolvedSet.has((t.topic || "").trim().toLowerCase()) ? { ...t, resolved: true } : t
    );
  }

  if (update.author_voice && typeof update.author_voice === "object") {
    const av = { tone: "", rhythm: "", recurring_phrases: [] as string[], style_notes: [] as string[], ...next.author_voice };
    if (update.author_voice.tone) av.tone = update.author_voice.tone;
    if (update.author_voice.rhythm) av.rhythm = update.author_voice.rhythm;
    for (const phrase of Array.isArray(update.author_voice.recurring_phrases) ? update.author_voice.recurring_phrases : []) {
      if (!av.recurring_phrases.includes(phrase)) av.recurring_phrases.push(phrase);
    }
    for (const note of Array.isArray(update.author_voice.style_notes) ? update.author_voice.style_notes : []) {
      if (!av.style_notes.includes(note)) av.style_notes.push(note);
    }
    next.author_voice = av;
  }

  if (Array.isArray(update.structure_hypotheses) && update.structure_hypotheses.length > 0) {
    const existing = new Map((Array.isArray(next.structure_hypotheses) ? next.structure_hypotheses : []).map((h) => [h.type, h]));
    for (const h of update.structure_hypotheses) {
      if (h && typeof h === "object" && typeof h.type === "string") existing.set(h.type, h);
    }
    next.structure_hypotheses = [...existing.values()];
  }

  return next;
}
