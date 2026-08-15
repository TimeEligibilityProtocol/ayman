import { prisma } from "@/lib/prisma";
import { getAnthropicClient, getMasterPrompt, MODEL } from "@/lib/anthropic";
import { RECORD_MEMORY_TOOL, mergeMemory, type StoryMemoryData, type MemoryUpdate } from "@/lib/memorySchema";
import { QUEUE_EDITOR_NOTES_TOOL, PROPOSE_STRUCTURE_TOOL, UPDATE_BOOK_INTENT_TOOL } from "@/lib/editorTools";
import { retrieveRelevant } from "@/lib/retrieval";
import { effectiveTranscript } from "@/lib/storyText";
import type { Book, Story, BookIntent } from "@prisma/client";

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

export async function getBookIntent(bookId: string): Promise<BookIntent | null> {
  return prisma.bookIntent.findUnique({ where: { bookId } });
}

/**
 * "How the author wants their book to read" — the answer to a different
 * question than StoryMemory. Rendered into a block the model must actually
 * respect: rejectedThemes/rejectedStructureIdeas are phrased as hard "do
 * not propose" instructions, not just background info, so a turned-down
 * idea doesn't quietly resurface next time.
 */
function buildIntentBlock(intent: BookIntent | null): string {
  if (!intent) return "";
  const lines: string[] = ["AUTHOR INTENT — how the author wants this book to read:"];
  if (intent.bookForm) lines.push(`Form: ${intent.bookForm}`);
  if (intent.structurePreference) lines.push(`Structure preference: ${intent.structurePreference}`);
  if (intent.voiceNotes.length) lines.push(...intent.voiceNotes.map((n) => `- ${n}`));
  if (intent.acceptedThemes.length) lines.push(`Themes the author has confirmed: ${intent.acceptedThemes.join(", ")}`);
  if (intent.rejectedThemes.length)
    lines.push(`Do NOT build the book around these — the author explicitly rejected them: ${intent.rejectedThemes.join(", ")}`);
  if (intent.titlePreferences.length) lines.push(`Title preferences: ${intent.titlePreferences.join(", ")}`);
  if (intent.hardConstraints.length) lines.push(`Hard constraints (never violate): ${intent.hardConstraints.join(", ")}`);
  if (intent.acceptedStructureIdeas.length)
    lines.push(`Ways of organizing the book the author has confirmed: ${intent.acceptedStructureIdeas.join(", ")}`);
  if (intent.rejectedStructureIdeas.length)
    lines.push(
      `Do NOT organize the book this way — the author explicitly rejected it: ${intent.rejectedStructureIdeas.join(", ")}`
    );
  return lines.length > 1 ? lines.join("\n") : "";
}

const INTENT_STRING_FIELDS = ["bookForm", "structurePreference"] as const;
const INTENT_LIST_FIELDS = [
  "voiceNotes",
  "acceptedThemes",
  "rejectedThemes",
  "titlePreferences",
  "hardConstraints",
  "acceptedStructureIdeas",
  "rejectedStructureIdeas",
] as const;

/**
 * Applied when the Editor calls update_book_intent mid-conversation — the
 * author just confirmed something (a title, a style rule, a theme to keep
 * or drop). List fields are additive/deduped, never a wholesale replace, so
 * one confirmed item can't accidentally wipe earlier ones the author hasn't
 * touched. Removing something is a deliberate action the author takes in
 * the Book Intent panel itself, not something a chat turn can do.
 */
async function applyIntentUpdate(bookId: string, patch: Record<string, unknown>) {
  const existing = await prisma.bookIntent.findUnique({ where: { bookId } });
  const data: Record<string, unknown> = {};

  for (const field of INTENT_STRING_FIELDS) {
    if (typeof patch[field] === "string" && (patch[field] as string).trim()) {
      data[field] = (patch[field] as string).trim();
    }
  }
  for (const field of INTENT_LIST_FIELDS) {
    const incoming = patch[field];
    if (Array.isArray(incoming) && incoming.every((v) => typeof v === "string")) {
      const existingList = (existing?.[field] as string[] | undefined) || [];
      const merged = Array.from(new Set([...existingList, ...incoming.map((s) => s.trim()).filter(Boolean)]));
      data[field] = merged;
    }
  }
  if (Object.keys(data).length === 0) return;

  await prisma.bookIntent.upsert({
    where: { bookId },
    update: data,
    create: { bookId, ...data },
  });
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
    select: { id: true, title: true, transcriptOriginal: true, transcriptCorrected: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const related = retrieveRelevant(
    otherStories.map((s) => ({ id: s.id, text: effectiveTranscript(s) })),
    effectiveTranscript(story),
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
        relatedStories.map((s) => `- ${storyLabel(s)}: "${effectiveTranscript(s)}"`).join("\n")
      : "",
    "[END CONTEXT]",
    "",
    `NEW STORY JUST RECORDED — "${story.title || "Untitled"}":`,
    effectiveTranscript(story),
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
    select: { id: true, title: true, transcriptOriginal: true, transcriptCorrected: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const related = retrieveRelevant(
    allStories.map((s) => ({ id: s.id, text: effectiveTranscript(s) })),
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
        relatedStories.map((s) => `- ${storyLabel(s)}: "${effectiveTranscript(s)}"`).join("\n")
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
    "\n\nAfter your reply text, always call record_memory_update with anything new learned this turn. If truly nothing is new, call it with an empty object." +
    "\n\nIf the author has just clearly confirmed or agreed to something about how THIS BOOK should be written — a title they like, its form, how they want it organized, a style/voice instruction, a theme to keep or leave out, or a hard rule — also call update_book_intent with just that. Only for a clear, just-happened confirmation ('yes, let's call it that', 'I like that structure', 'don't mention X') — not for ideas still being explored or casual mentions.";

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    tools: [RECORD_MEMORY_TOOL, UPDATE_BOOK_INTENT_TOOL],
    messages: [{ role: "user", content: contextBlock }],
  });

  let replyText = "";
  let memoryUpdate: MemoryUpdate | null = null;
  let intentUpdate: Record<string, unknown> | null = null;
  for (const block of response.content) {
    if (block.type === "text") replyText += block.text;
    if (block.type === "tool_use" && block.name === "record_memory_update") {
      memoryUpdate = block.input as MemoryUpdate;
    }
    if (block.type === "tool_use" && block.name === "update_book_intent") {
      intentUpdate = block.input as Record<string, unknown>;
    }
  }

  if (intentUpdate) {
    await applyIntentUpdate(bookId, intentUpdate);
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
 * "Protect the author's voice" is only as good as the material the model
 * actually gets to hear that voice in. Renders StoryMemory's author_voice
 * observations + a handful of real quotes into a block the model can
 * concretely imitate, instead of a bare instruction with nothing behind it.
 */
function buildVoiceProfileBlock(memory: StoryMemoryData): string {
  const voice = memory.author_voice;
  const quotes = (memory.important_quotes || []).slice(0, 5) as Array<{ text?: string }>;
  if (!voice && quotes.length === 0) return "";

  const lines: string[] = ["AUTHOR VOICE PROFILE — imitate this, don't default to generic memoir prose:"];
  if (voice?.tone) lines.push(`Tone: ${voice.tone}`);
  if (voice?.rhythm) lines.push(`Rhythm: ${voice.rhythm}`);
  if (voice?.recurring_phrases?.length) lines.push(`Recurring phrases: ${voice.recurring_phrases.join(", ")}`);
  if (voice?.style_notes?.length) lines.push(...voice.style_notes.map((n) => `- ${n}`));
  if (quotes.length) {
    lines.push("Real fragments in the author's own words:");
    lines.push(...quotes.filter((q) => q.text).map((q) => `"${q.text}"`));
  }
  return lines.join("\n");
}

/**
 * Handles the "Yes, that's it" approval — promotes a Story's transcript
 * into an Approved Story via a literary edit at the book's chosen
 * intensity level. The original transcript is never touched.
 */
export async function approveStory(storyId: string): Promise<string> {
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId }, include: { book: true } });
  const intensity = story.book.editingIntensity || "keep_voice";
  const instruction = EDITING_INTENSITY_INSTRUCTIONS[intensity] || EDITING_INTENSITY_INSTRUCTIONS.keep_voice;
  const memory = await getStoryMemory(story.bookId);
  const voiceProfile = buildVoiceProfileBlock(memory);
  const intentBlock = buildIntentBlock(await getBookIntent(story.bookId));

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system:
      getMasterPrompt() +
      `\n\nWRITING MODE. The author has approved this story to become part of their manuscript. Editing intensity: ${intensity}. ${instruction} Never invent facts. Respond with ONLY the edited text, no preamble, no commentary.` +
      (voiceProfile ? `\n\n${voiceProfile}` : "") +
      (intentBlock ? `\n\n${intentBlock}` : ""),
    messages: [{ role: "user", content: effectiveTranscript(story) }],
  });

  const text = response.content.find((b) => b.type === "text");
  const approvedText = text && "text" in text ? text.text.trim() : effectiveTranscript(story);

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
 * Generates a hypothesis for grouping currently-UNPLACED Stories into new
 * Chapters — never writes Part/Chapter/Thread/Story directly. Existing
 * structure (locked or not) is never touched by this; the author reviews
 * each proposed Chapter individually (see acceptProposalItem/
 * rejectProposalItem) and only accepted ones become real. To reconsider an
 * existing Chapter, the author deletes it (already unplaces its Stories
 * without losing them) — that's the "reject an existing grouping" half of
 * this system; this function is the "propose a new one" half.
 */
export async function proposeBookStructure(bookId: string) {
  const memory = await getStoryMemory(bookId);

  // Only genuinely unplaced Stories are ever up for (re)proposal — an
  // existing Chapter, locked or not, is never regrouped or destroyed by
  // generating a new proposal.
  const stories = await prisma.story.findMany({
    where: { bookId, transcriptOriginal: { not: null }, threadId: null },
    select: {
      id: true,
      title: true,
      transcriptOriginal: true,
      transcriptCorrected: true,
      approvedText: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (stories.length === 0) {
    return { itemCount: 0, storyCount: 0 };
  }

  // Still needs to SEE everything already committed (any Part, locked or
  // not) so the new material it proposes reads as one coherent book
  // alongside it, not a mismatched add-on — it just can't touch any of it.
  const existingParts = await prisma.part.findMany({
    where: { bookId },
    orderBy: { order: "asc" },
    include: { chapters: { include: { threads: { include: { stories: true } } } } },
  });
  const existingBlock = existingParts.length
    ? "ALREADY-EXISTING PARTS OF THIS BOOK (do not recreate, rename, or duplicate these — the new Chapters you propose must read as belonging to the same book):\n" +
      existingParts
        .map((p) => {
          const chapterLines = p.chapters
            .map((c) => `  - Chapter: "${c.title}" (${c.threads.reduce((n, t) => n + t.stories.length, 0)} stories)`)
            .join("\n");
          const noteLine = p.authorNote ? `\n  Author's guidance for what comes next: "${p.authorNote}"` : "";
          return `- Part: "${p.title}"\n${chapterLines}${noteLine}`;
        })
        .join("\n")
    : "";

  const intentBlock = buildIntentBlock(await getBookIntent(bookId));
  const voiceProfile = buildVoiceProfileBlock(memory);

  const contextBlock = [
    "STORY MEMORY:",
    JSON.stringify(memory, null, 2),
    "",
    voiceProfile,
    "",
    intentBlock,
    "",
    existingBlock,
    "",
    "STORIES STILL TO PLACE (id, title, and either the approved text or the raw transcript):",
    ...stories.map(
      (s) => `- id="${s.id}" title="${s.title || "Untitled"}"\n  ${(s.approvedText || effectiveTranscript(s)).slice(0, 600)}`
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
      "\n\nSTRUCTURE MODE. Propose new Part/Chapter/Thread groupings by calling propose_structure, for the stories listed under STORIES STILL TO PLACE only. This is a hypothesis for the author to review, not a commitment — group stories that genuinely belong together; leave anything unclear out entirely rather than forcing it in. If ALREADY-EXISTING PARTS are listed, the new Parts/Chapters you propose are an addition to those, not a replacement — keep tone, themes, and chronology coherent with what's already there, and prefer reusing an existing Part's exact title when a new Chapter clearly belongs under it. If AUTHOR INTENT is present, treat its rejected themes/ideas as hard exclusions, not soft preferences. Part and Chapter titles should sound like this specific author's book, not a generic memoir — use the AUTHOR VOICE PROFILE if present.",
    tools: [PROPOSE_STRUCTURE_TOOL],
    tool_choice: { type: "tool", name: "propose_structure" },
    messages: [{ role: "user", content: contextBlock }],
  });

  const toolBlock = response.content.find(
    (b) => b.type === "tool_use" && b.name === "propose_structure"
  );
  if (!toolBlock || toolBlock.type !== "tool_use") return { itemCount: 0, storyCount: 0 };

  const proposal = toolBlock.input as {
    parts?: Array<{
      title: string;
      chapters: Array<{ title: string; threads: Array<{ title: string; storyIds: string[] }> }>;
    }>;
  };
  if (!Array.isArray(proposal.parts)) return { itemCount: 0, storyCount: 0 };

  // A regenerated hypothesis replaces the previous one — safe, since
  // nothing in a pending proposal was ever committed. Only pending items
  // are cleared; anything already accepted/rejected is history, not touched.
  const stalePending = await prisma.structureProposalItem.findMany({
    where: { status: "pending", proposal: { bookId } },
    select: { id: true },
  });
  if (stalePending.length) {
    await prisma.structureProposalItem.deleteMany({ where: { id: { in: stalePending.map((i) => i.id) } } });
  }

  const createdProposal = await prisma.structureProposal.create({ data: { bookId } });

  let itemCount = 0;
  let storyCount = 0;
  for (const part of proposal.parts) {
    for (const chapter of part.chapters) {
      const threads = chapter.threads
        .map((t) => ({ title: t.title, storyIds: t.storyIds.filter(Boolean) }))
        .filter((t) => t.storyIds.length > 0);
      if (threads.length === 0) continue;
      await prisma.structureProposalItem.create({
        data: {
          proposalId: createdProposal.id,
          partTitle: part.title,
          chapterTitle: chapter.title,
          threads,
        },
      });
      itemCount++;
      storyCount += threads.reduce((n, t) => n + t.storyIds.length, 0);
    }
  }

  return { itemCount, storyCount };
}

/**
 * Commits one proposed Chapter for real: finds-or-creates its Part by exact
 * title match (so a Chapter proposed under an existing Part's name joins
 * it, rather than duplicating it), creates the Chapter and its Thread(s),
 * and places only the Stories that are STILL unplaced (a story could in
 * theory have been placed some other way between proposal and review).
 */
export async function acceptProposalItem(itemId: string) {
  const item = await prisma.structureProposalItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { proposal: true },
  });
  if (item.status !== "pending") return;
  const bookId = item.proposal.bookId;

  let part = await prisma.part.findFirst({ where: { bookId, title: item.partTitle } });
  if (!part) {
    const maxOrder = await prisma.part.aggregate({ where: { bookId }, _max: { order: true } });
    part = await prisma.part.create({
      data: { bookId, title: item.partTitle, order: (maxOrder._max.order ?? -1) + 1 },
    });
  }

  const maxChapterOrder = await prisma.chapter.aggregate({ where: { partId: part.id }, _max: { order: true } });
  const chapter = await prisma.chapter.create({
    data: {
      bookId,
      partId: part.id,
      title: item.chapterTitle,
      order: (maxChapterOrder._max.order ?? -1) + 1,
    },
  });

  const threads = item.threads as Array<{ title: string; storyIds: string[] }>;
  for (const thread of threads) {
    const createdThread = await prisma.thread.create({
      data: { bookId, chapterId: chapter.id, title: thread.title },
    });
    if (thread.storyIds.length > 0) {
      await prisma.story.updateMany({
        where: { id: { in: thread.storyIds }, bookId, threadId: null },
        data: { threadId: createdThread.id },
      });
    }
  }

  await prisma.structureProposalItem.update({ where: { id: itemId }, data: { status: "accepted" } });
}

/** Leaves the item's Stories unplaced — nothing else happens. */
export async function rejectProposalItem(itemId: string) {
  await prisma.structureProposalItem.update({ where: { id: itemId }, data: { status: "rejected" } });
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
