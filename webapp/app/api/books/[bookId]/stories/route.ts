import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";
import { transcribeAudio } from "@/lib/openai";
import { generateStoryTitle, analyzeNewStory } from "@/lib/editor";
import { saveAudioFile } from "@/lib/storage";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const stories = await prisma.story.findMany({
    where: { bookId: book.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ stories });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const form = await req.formData();
  const audio = form.get("audio");
  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: "Missing 'audio' file field" }, { status: 400 });
  }

  const arrayBuffer = await audio.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = (audio.type.split("/")[1] || "webm").split(";")[0];

  let transcript: { text: string; language: string | null };
  try {
    transcript = await transcribeAudio(buffer, `story.${extension}`);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 502 }
    );
  }

  const story = await prisma.story.create({
    data: {
      bookId: book.id,
      transcriptOriginal: transcript.text,
      transcriptLanguage: transcript.language,
      durationSec: null,
    },
  });

  const audioUrl = await saveAudioFile(book.slug, story.id, buffer, extension);

  let title = "Untitled story";
  try {
    title = await generateStoryTitle(transcript.text);
  } catch (err) {
    console.error("Title generation failed:", err);
  }

  const updated = await prisma.story.update({
    where: { id: story.id },
    data: { audioUrl, title },
  });

  try {
    await analyzeNewStory(book.id, story.id);
  } catch (err) {
    console.error("Silent Editor analysis failed:", err);
  }

  return NextResponse.json({ story: updated });
}
