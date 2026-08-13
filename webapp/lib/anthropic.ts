import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";

export const MODEL = "claude-opus-5";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Export it in the terminal you run `npm run dev` from."
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

let cachedMasterPrompt: string | null = null;

export function getMasterPrompt(): string {
  if (!cachedMasterPrompt) {
    cachedMasterPrompt = fs.readFileSync(
      path.join(process.cwd(), "content", "master-prompt.md"),
      "utf-8"
    );
  }
  return cachedMasterPrompt;
}
