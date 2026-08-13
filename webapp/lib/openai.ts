import OpenAI from "openai";
import { toFile } from "openai/uploads";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. Export it in the terminal you run `npm run dev` from — it's used for speech-to-text."
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function transcribeAudio(
  buffer: Buffer,
  filename: string
): Promise<{ text: string; language: string | null }> {
  const openai = getOpenAIClient();
  const file = await toFile(buffer, filename);
  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "verbose_json",
  });
  return {
    text: result.text,
    language: (result as unknown as { language?: string }).language ?? null,
  };
}
