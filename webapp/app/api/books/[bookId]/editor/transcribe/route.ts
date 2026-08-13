import { NextRequest, NextResponse } from "next/server";
import { getBookBySlugOrNull } from "@/lib/getBook";
import { transcribeAudio } from "@/lib/openai";

// Transcription-only endpoint for voice input in "Talk to my Editor" —
// unlike /stories, this never creates a Story; it just turns speech into
// text so it can be sent as a chat message.
export async function POST(req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const form = await req.formData();
  const audio = form.get("audio");
  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: "Missing 'audio' file field" }, { status: 400 });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const extension = (audio.type.split("/")[1] || "webm").split(";")[0];

  try {
    const transcript = await transcribeAudio(buffer, `speech.${extension}`);
    return NextResponse.json({ text: transcript.text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 502 }
    );
  }
}
