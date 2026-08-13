// Extra Anthropic tool schemas beyond record_memory_update (see memorySchema.ts).

export const QUEUE_EDITOR_NOTES_TOOL = {
  name: "queue_editor_notes",
  description:
    "Queue 0-3 short Editor's Notes for the user to discover later when they open the Editor tab. Only queue notes that are genuinely earned — it is fine to queue none. Each note body should be 1-2 sentences, in your natural editorial voice.",
  input_schema: {
    type: "object" as const,
    properties: {
      notes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["observation", "pattern", "question"] },
            title: { type: "string", description: "Short label, 2-4 words, e.g. 'Your father'" },
            body: { type: "string" },
          },
          required: ["kind", "title", "body"],
        },
      },
    },
    required: ["notes"],
  },
};

export const PROPOSE_STRUCTURE_TOOL = {
  name: "propose_structure",
  description:
    "Propose (or revise) the book's structure: Parts containing Chapters containing Threads, each Thread grouping specific Story ids. Every story id you were given must appear in exactly one thread, OR be left out entirely to remain 'Unplaced' if it doesn't clearly belong anywhere yet — do not force placement.",
  input_schema: {
    type: "object" as const,
    properties: {
      parts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            chapters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  threads: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        storyIds: { type: "array", items: { type: "string" } },
                      },
                      required: ["title", "storyIds"],
                    },
                  },
                },
                required: ["title", "threads"],
              },
            },
          },
          required: ["title", "chapters"],
        },
      },
    },
    required: ["parts"],
  },
};
