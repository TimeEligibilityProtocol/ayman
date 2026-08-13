// One-off verification script: seeds a few realistic Stories directly
// (skipping audio/transcription, which need OPENAI_API_KEY and a real mic)
// and runs them through the real Editor pipeline against the live
// Anthropic API, to prove the ported architecture works end-to-end.
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

import { prisma } from "../lib/prisma";
import { analyzeNewStory, chatWithEditor, proposeBookStructure, approveStory } from "../lib/editor";

const STORIES = [
  {
    title: "Sunday with my Father",
    text: "My father sold his car in 1994 to pay for my first semester at university. He never told me until years later. I only found out when my uncle mentioned it at a family dinner, almost as a joke, like everyone already knew. My father just looked down at his plate.",
  },
  {
    title: "Leaving Warsaw",
    text: "I left Warsaw in 2003 with one suitcase. I told everyone it was for a job, but really I just needed to not be somewhere anymore. I remember standing at the airport gate and feeling relief before I felt anything like sadness.",
  },
  {
    title: "The phone call from London",
    text: "Three years later I left London too, in the middle of what I thought was a good life there. My brother called me the night before I booked the flight and asked why I always do this, why I always leave right when things are finally working. I didn't have a good answer for him then. I'm not sure I do now.",
  },
];

async function main() {
  const book = await prisma.book.findUniqueOrThrow({ where: { slug: "ayman" } });

  // clean slate for repeatable testing
  await prisma.conversationTurn.deleteMany({ where: { bookId: book.id } });
  await prisma.editorNote.deleteMany({ where: { bookId: book.id } });
  await prisma.story.updateMany({ where: { bookId: book.id }, data: { threadId: null } });
  await prisma.thread.deleteMany({ where: { bookId: book.id } });
  await prisma.chapter.deleteMany({ where: { bookId: book.id } });
  await prisma.part.deleteMany({ where: { bookId: book.id } });
  await prisma.story.deleteMany({ where: { bookId: book.id } });
  await prisma.storyMemory.upsert({
    where: { bookId: book.id },
    update: { data: {} },
    create: { bookId: book.id, data: {} },
  });

  for (const s of STORIES) {
    const story = await prisma.story.create({
      data: {
        bookId: book.id,
        title: s.title,
        transcriptOriginal: s.text,
        transcriptEnglish: s.text,
      },
    });
    console.log(`Created story "${s.title}" (${story.id}) — analyzing…`);
    const result = await analyzeNewStory(book.id, story.id);
    console.log(`  -> ${result.notesQueued} editor note(s) queued`);
  }

  console.log("\n--- Talk to Editor: turn 1 ---");
  const chat1 = await chatWithEditor(book.id, "I want to talk about my father, actually.");
  console.log("Editor:", chat1.reply);
  console.log("Related stories:", chat1.relatedStories.map((s) => s.title));

  console.log("\n--- Talk to Editor: turn 2 ---");
  const chat2 = await chatWithEditor(book.id, "I never thought about it that way.");
  console.log("Editor:", chat2.reply);

  console.log("\n--- Approving first story ---");
  const firstStory = await prisma.story.findFirstOrThrow({ where: { bookId: book.id }, orderBy: { createdAt: "asc" } });
  const approved = await approveStory(firstStory.id);
  console.log("Approved text:\n", approved);

  console.log("\n--- Proposing book structure ---");
  const structure = await proposeBookStructure(book.id);
  console.log(structure);

  const memory = await prisma.storyMemory.findUniqueOrThrow({ where: { bookId: book.id } });
  console.log("\n--- Final Story Memory ---");
  console.log(JSON.stringify(memory.data, null, 2));

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
