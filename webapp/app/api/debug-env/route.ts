import { NextResponse } from "next/server";

// TEMPORARY diagnostic route — reports which env vars (by name only,
// never values) contain a character outside the Latin1/ByteString range,
// plus first/last few characters (safe, not the full secret) to confirm
// whether a fresh save actually took effect. Remove once resolved.
const VARS = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"];

export async function GET() {
  const report: Record<string, unknown> = {};

  for (const name of VARS) {
    const value = process.env[name];
    if (value === undefined) {
      report[name] = "MISSING";
      continue;
    }
    const badChars: Array<{ index: number; code: number }> = [];
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code > 255) badChars.push({ index: i, code });
    }
    report[name] = {
      length: value.length,
      first10: value.slice(0, 10),
      last6: value.slice(-6),
      badCharCount: badChars.length,
      firstBadCharIndex: badChars[0]?.index ?? null,
    };
  }

  report["checkedAtDeployId"] = process.env.RENDER_GIT_COMMIT || "unknown";
  return NextResponse.json(report);
}
