import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";
import { translateStory } from "@/lib/editor";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string; storyId: string }> }
) {
  const { bookId, storyId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story || story.bookId !== book.id) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const { language } = (await req.json()) as { language?: "english" | "arabic" };
  if (language !== "english" && language !== "arabic") {
    return NextResponse.json({ error: "language must be 'english' or 'arabic'" }, { status: 400 });
  }
  if (!story.transcriptOriginal) {
    return NextResponse.json({ error: "Story has no transcript yet" }, { status: 400 });
  }

  try {
    const translated = await translateStory(story.transcriptOriginal, language);
    const field = language === "english" ? "transcriptEnglish" : "transcriptArabic";
    const updated = await prisma.story.update({ where: { id: storyId }, data: { [field]: translated } });
    return NextResponse.json({ story: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Translation failed" },
      { status: 502 }
    );
  }
}
