import { prisma } from "@/lib/prisma";
import { getAnthropicClient, getMasterPrompt, MODEL } from "@/lib/anthropic";
import { RECORD_MEMORY_TOOL, mergeMemory, type StoryMemoryData, type MemoryUpdate } from "@/lib/memorySchema";
import { QUEUE_EDITOR_NOTES_TOOL, PROPOSE_STRUCTURE_TOOL } from "@/lib/editorTools";
import { retrieveRelevant } from "@/lib/retrieval";
import type { Book, Story } from "@prisma/client";

const RECENT_TURNS_WINDOW = 6; // messages (user+editor combined)
const RETRIEVAL_TOP_K = 4;

async function getStoryMemory(bookId: string): Promise<StoryMemoryData> {
  const row = await prisma.storyMemory.findUnique({ where: { bookId } });
  return (row?.data as StoryMemoryData) ?? {};
}

async function saveStoryMemory(bookId: string, data: StoryMemoryData) {
  await prisma.storyMemory.upsert({
    where: { bookId },
    update: { data: data as object },
    create: { bookId, data: data as object },
  });
}

function storyLabel(s: Pick<Story, "id" | "title" | "createdAt">) {
  const date = new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${s.title || "Untitled story"} (${date})`;
}

/**
 * Runs right after a Story is captured. No reply is shown to the user —
 * this just updates Story Memory and optionally queues Editor's Notes for
 * later. Mirrors the terminal prototype's per-turn tool call, but in
 * "silent analysis" mode instead of a conversation turn.
 */
export async function analyzeNewStory(bookId: string, storyId: string) {
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });
  const memory = await getStoryMemory(bookId);

  const otherStories = await prisma.story.findMany({
    where: { bookId, id: { not: storyId }, transcriptOriginal: { not: null } },
    select: { id: true, title: true, transcriptOriginal: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const related = retrieveRelevant(
    otherStories.map((s) => ({ id: s.id, text: s.transcriptOriginal || "" })),
    story.transcriptOriginal || "",
    RETRIEVAL_TOP_K
  );
  const relatedStories = otherStories.filter((s) => related.some((r) => r.id === s.id));

  const contextBlock = [
    "[CONTEXT - reference material]",
    "",
    "STORY MEMORY:",
    JSON.stringify(memory, null, 2),
    "",
    relatedStories.length
      ? "RELATED EARLIER STORIES (verbatim, ground truth):\n" +
        relatedStories.map((s) => `- ${storyLabel(s)}: "${s.transcriptOriginal}"`).join("\n")
      : "",
    "[END CONTEXT]",
    "",
    `NEW STORY JUST RECORDED — "${story.title || "Untitled"}":`,
    story.transcriptOriginal || "",
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt =
    getMasterPrompt() +
    "\n\n---\n\nSILENT ANALYSIS MODE: a new Story was just recorded. There is no reply to write — the user is not present, do not address them directly. " +
    "First, call record_memory_update with anything new learned from this story (if truly nothing is new, call it with an empty object). " +
    "Then call queue_editor_notes with 0-3 short notes worth surfacing later — an observation, a pattern connecting to earlier stories, or a question you'd like to ask. Only queue what's genuinely earned.";

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    system: systemPrompt,
    tools: [RECORD_MEMORY_TOOL, QUEUE_EDITOR_NOTES_TOOL],
    messages: [{ role: "user", content: contextBlock }],
  });

  let memoryUpdate: MemoryUpdate | null = null;
  let notes: Array<{ kind: string; title: string; body: string }> = [];

  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "record_memory_update") {
      memoryUpdate = block.input as MemoryUpdate;
    }
    if (block.type === "tool_use" && block.name === "queue_editor_notes") {
      notes = (block.input as { notes: typeof notes }).notes || [];
    }
  }

  if (memoryUpdate) {
    const titleSuggestion = memoryUpdate.book_title_suggestion;
    delete memoryUpdate.book_title_suggestion;
    const nextMemory = mergeMemory(memory, memoryUpdate);
    await saveStoryMemory(bookId, nextMemory);

    if (titleSuggestion) {
      const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
      const candidates = ((book.titleCandidates as string[] | null) || []).includes(titleSuggestion)
        ? (book.titleCandidates as string[])
        : [...((book.titleCandidates as string[] | null) || []), titleSuggestion];
      await prisma.book.update({
        where: { id: bookId },
        data: { title: titleSuggestion, titleCandidates: candidates },
      });
    }
  }

  for (const note of notes) {
    await prisma.editorNote.create({
      data: { bookId, storyId, kind: note.kind, title: note.title, body: note.body },
    });
  }

  return { notesQueued: notes.length };
}

interface ChatResult {
  reply: string;
  relatedStories: Array<{ id: string; title: string | null; createdAt: Date }>;
}

/**
 * "Talk to my Editor" — one conversational turn. Reuses the same layered
 * context (Story Memory + relevant retrieved fragments + recent turns)
 * validated in the terminal prototype.
 */
export async function chatWithEditor(bookId: string, userText: string): Promise<ChatResult> {
  const memory = await getStoryMemory(bookId);

  const allStories = await prisma.story.findMany({
    where: { bookId, transcriptOriginal: { not: null } },
    select: { id: true, title: true, transcriptOriginal: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const related = retrieveRelevant(
    allStories.map((s) => ({ id: s.id, text: s.transcriptOriginal || "" })),
    userText,
    RETRIEVAL_TOP_K
  );
  const relatedStories = allStories.filter((s) => related.some((r) => r.id === s.id));

  const recentTurns = await prisma.conversationTurn.findMany({
    where: { bookId },
    orderBy: { createdAt: "desc" },
    take: RECENT_TURNS_WINDOW,
  });
  recentTurns.reverse();

  const contextBlock = [
    "[CONTEXT - reference material, not part of what the user is saying]",
    "",
    "STORY MEMORY:",
    JSON.stringify(memory, null, 2),
    "",
    relatedStories.length
      ? "RELEVANT PAST STORIES (verbatim, ground truth):\n" +
        relatedStories.map((s) => `- ${storyLabel(s)}: "${s.transcriptOriginal}"`).join("\n")
      : "",
    recentTurns.length
      ? "RECENT CONVERSATION:\n" +
        recentTurns.map((t) => `${t.role === "user" ? "user" : "editor"}: ${t.text}`).join("\n")
      : "",
    "[END CONTEXT]",
    "",
    "USER'S LATEST MESSAGE:",
    userText,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt =
    getMasterPrompt() +
    "\n\nAfter your reply text, always call record_memory_update with anything new learned this turn. If truly nothing is new, call it with an empty object.";

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    tools: [RECORD_MEMORY_TOOL],
    messages: [{ role: "user", content: contextBlock }],
  });

  let replyText = "";
  let memoryUpdate: MemoryUpdate | null = null;
  for (const block of response.content) {
    if (block.type === "text") replyText += block.text;
    if (block.type === "tool_use" && block.name === "record_memory_update") {
      memoryUpdate = block.input as MemoryUpdate;
    }
  }

  await prisma.conversationTurn.create({ data: { bookId, role: "user", text: userText } });
  await prisma.conversationTurn.create({ data: { bookId, role: "editor", text: replyText } });

  if (memoryUpdate) {
    const titleSuggestion = memoryUpdate.book_title_suggestion;
    delete memoryUpdate.book_title_suggestion;
    const nextMemory = mergeMemory(memory, memoryUpdate);
    await saveStoryMemory(bookId, nextMemory);

    if (titleSuggestion) {
      const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
      const candidates = ((book.titleCandidates as string[] | null) || []).includes(titleSuggestion)
        ? (book.titleCandidates as string[])
        : [...((book.titleCandidates as string[] | null) || []), titleSuggestion];
      await prisma.book.update({
        where: { id: bookId },
        data: { title: titleSuggestion, titleCandidates: candidates },
      });
    }
  }

  return {
    reply: replyText,
    relatedStories: relatedStories.map((s) => ({ id: s.id, title: s.title, createdAt: s.createdAt })),
  };
}

const EDITING_INTENSITY_INSTRUCTIONS: Record<string, string> = {
  keep_voice:
    "Keep the author's spoken voice almost entirely intact. Only fix things that would confuse a reader: false starts, filler words, broken sentences. Do not smooth out repetition that carries emotional meaning. This should still sound like someone talking.",
  polish_lightly:
    "Light touch: clean up grammar, remove filler, tighten sentences. Keep the vocabulary, rhythm, and personality of the speaker. A reader should still hear this specific person.",
  literary_edit:
    "A fuller literary edit: improve pacing, structure the scene, sharpen imagery, cut what doesn't serve the story — while preserving what actually happened and the emotional truth. This can read like crafted narrative prose.",
  publication_ready:
    "Publication-ready prose: full literary craft, strong opening and closing lines, scene-level pacing, nothing that reads as transcribed speech. Still never invent facts, people, or events not present in the original.",
};

/**
 * Handles the "Yes, that's it" approval — promotes a Story's transcript
 * into an Approved Story via a literary edit at the book's chosen
 * intensity level. The original transcript is never touched.
 */
export async function approveStory(storyId: string): Promise<string> {
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId }, include: { book: true } });
  const intensity = story.book.editingIntensity || "keep_voice";
  const instruction = EDITING_INTENSITY_INSTRUCTIONS[intensity] || EDITING_INTENSITY_INSTRUCTIONS.keep_voice;

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system:
      getMasterPrompt() +
      `\n\nWRITING MODE. The author has approved this story to become part of their manuscript. Editing intensity: ${intensity}. ${instruction} Never invent facts. Respond with ONLY the edited text, no preamble, no commentary.`,
    messages: [{ role: "user", content: story.transcriptOriginal || "" }],
  });

  const text = response.content.find((b) => b.type === "text");
  const approvedText = text && "text" in text ? text.text.trim() : story.transcriptOriginal || "";

  await prisma.story.update({
    where: { id: storyId },
    data: { approvalState: "approved", approvedText },
  });

  return approvedText;
}

export async function setStoryDecision(
  storyId: string,
  decision: "exploring" | "not_quite" | "deferred"
) {
  await prisma.story.update({ where: { id: storyId }, data: { approvalState: decision } });
}

/**
 * Generates (or regenerates) the whole book structure — Parts > Chapters >
 * Threads > Stories — as a revisable hypothesis, never forced. Re-running
 * this replaces the previous grouping; Story content itself is untouched.
 */
export async function proposeBookStructure(bookId: string) {
  const memory = await getStoryMemory(bookId);

  // Stories already inside a locked Part are off the table entirely — the
  // model only ever sees, and only ever regroups, stories that are either
  // unplaced or sitting in a Part nobody has locked yet. It still needs to
  // SEE the locked Parts (titles + what they cover) so the new material it
  // proposes reads as one coherent book alongside them, not a mismatched
  // add-on.
  const lockedParts = await prisma.part.findMany({
    where: { bookId, locked: true },
    orderBy: { order: "asc" },
    include: { chapters: { include: { threads: { include: { stories: true } } } } },
  });
  const lockedPartCount = lockedParts.length;
  const stories = await prisma.story.findMany({
    where: {
      bookId,
      transcriptOriginal: { not: null },
      OR: [{ threadId: null }, { thread: { chapter: { part: { locked: false } } } }],
    },
    select: { id: true, title: true, transcriptOriginal: true, approvedText: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (stories.length === 0) {
    return { parts: lockedPartCount, chapters: 0, threads: 0, skippedLocked: lockedPartCount };
  }

  const lockedBlock = lockedParts.length
    ? "ALREADY-FINAL PARTS OF THIS BOOK (locked by the author — do not recreate, rename, or duplicate these; the new material you propose must read as belonging to the same book):\n" +
      lockedParts
        .map((p) => {
          const chapterLines = p.chapters
            .map((c) => `  - Chapter: "${c.title}" (${c.threads.reduce((n, t) => n + t.stories.length, 0)} stories)`)
            .join("\n");
          const noteLine = p.authorNote ? `\n  Author's guidance for what comes next: "${p.authorNote}"` : "";
          return `- Part: "${p.title}"\n${chapterLines}${noteLine}`;
        })
        .join("\n")
    : "";

  const contextBlock = [
    "STORY MEMORY:",
    JSON.stringify(memory, null, 2),
    "",
    lockedBlock,
    "",
    "STORIES STILL TO PLACE (id, title, and either the approved text or the raw transcript):",
    ...stories.map(
      (s) => `- id="${s.id}" title="${s.title || "Untitled"}"\n  ${(s.approvedText || s.transcriptOriginal || "").slice(0, 600)}`
    ),
  ]
    .filter(Boolean)
    .join("\n");

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system:
      getMasterPrompt() +
      "\n\nSTRUCTURE MODE. Propose (or revise) the book's Part/Chapter/Thread structure by calling propose_structure, for the stories listed under STORIES STILL TO PLACE only. This is only a hypothesis, not a commitment — group stories that genuinely belong together; leave anything unclear out entirely rather than forcing it in. If ALREADY-FINAL PARTS are listed, the new Parts you propose are an addition to those, not a replacement — keep tone, themes, and chronology coherent with what's already locked in.",
    tools: [PROPOSE_STRUCTURE_TOOL],
    tool_choice: { type: "tool", name: "propose_structure" },
    messages: [{ role: "user", content: contextBlock }],
  });

  const toolBlock = response.content.find(
    (b) => b.type === "tool_use" && b.name === "propose_structure"
  );
  if (!toolBlock || toolBlock.type !== "tool_use") return { parts: 0, chapters: 0, threads: 0 };

  const proposal = toolBlock.input as {
    parts: Array<{
      title: string;
      chapters: Array<{ title: string; threads: Array<{ title: string; storyIds: string[] }> }>;
    }>;
  };

  // Wipe only the UNLOCKED parts of the previous structure — locked Parts
  // (and everything under them) are left completely untouched. Story
  // content itself is never touched either way.
  const unlockedParts = await prisma.part.findMany({
    where: { bookId, locked: false },
    include: { chapters: true },
  });
  const unlockedChapterIds = unlockedParts.flatMap((p) => p.chapters.map((c) => c.id));
  const unlockedThreads = await prisma.thread.findMany({ where: { chapterId: { in: unlockedChapterIds } } });
  await prisma.story.updateMany({
    where: { threadId: { in: unlockedThreads.map((t) => t.id) } },
    data: { threadId: null },
  });
  await prisma.thread.deleteMany({ where: { chapterId: { in: unlockedChapterIds } } });
  await prisma.chapter.deleteMany({ where: { id: { in: unlockedChapterIds } } });
  await prisma.part.deleteMany({ where: { bookId, locked: false } });

  const maxLockedOrder = await prisma.part.aggregate({ where: { bookId, locked: true }, _max: { order: true } });
  const startOrder = (maxLockedOrder._max.order ?? -1) + 1;

  let chapterCount = 0;
  let threadCount = 0;

  for (const [partIdx, part] of proposal.parts.entries()) {
    const createdPart = await prisma.part.create({
      data: { bookId, title: part.title, order: startOrder + partIdx },
    });
    for (const [chapterIdx, chapter] of part.chapters.entries()) {
      const createdChapter = await prisma.chapter.create({
        data: { bookId, partId: createdPart.id, title: chapter.title, order: chapterIdx },
      });
      chapterCount++;
      for (const thread of chapter.threads) {
        const createdThread = await prisma.thread.create({
          data: { bookId, chapterId: createdChapter.id, title: thread.title },
        });
        threadCount++;
        if (thread.storyIds.length > 0) {
          await prisma.story.updateMany({
            where: { id: { in: thread.storyIds }, bookId },
            data: { threadId: createdThread.id },
          });
        }
      }
    }
  }

  return {
    parts: proposal.parts.length + lockedPartCount,
    chapters: chapterCount,
    threads: threadCount,
    skippedLocked: lockedPartCount,
  };
}

/**
 * Runs automatically right after recording — just a short title, in the
 * story's own language. Translation is a separate, on-demand step (see
 * translateStory below): most authors record and read in one language,
 * so auto-translating every story into English and Arabic up front was
 * clutter nobody asked for.
 */
export async function generateStoryTitle(transcript: string): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system:
      "Produce a short evocative title (2-6 words) for this spoken memoir/story fragment, in the same language the author used, e.g. 'Sunday with my Father'. Respond ONLY with the title text. No quotes, no commentary.",
    messages: [{ role: "user", content: transcript }],
  });
  const text = response.content.find((b) => b.type === "text");
  const title = text && "text" in text ? text.text.trim() : "";
  return title || "Untitled story";
}

/**
 * On-demand translation of one story into one target language, triggered
 * by the author tapping "Translate to English/Arabic" — never automatic.
 */
export async function translateStory(
  transcript: string,
  language: "english" | "arabic"
): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system:
      language === "english"
        ? "You translate spoken memoir/story transcripts into English. It should read natural, not literal — preserve meaning, tone, and names. Respond ONLY with the translated text. No commentary, no markdown."
        : "You translate spoken memoir/story transcripts into Arabic. It should sound natural to an Arabic reader, not mechanically translated — preserve meaning, tone, and names. Respond ONLY with the translated text. No commentary, no markdown.",
    messages: [{ role: "user", content: transcript }],
  });
  const text = response.content.find((b) => b.type === "text");
  return text && "text" in text ? text.text.trim() : "";
}

export type { Book };
