import { NextResponse } from "next/server";

// TEMPORARY diagnostic route — reports which env vars (by name only,
// never values) contain a character outside the Latin1/ByteString range,
// to track down the "Cannot convert argument to a ByteString" error.
// Remove once the root cause is found.
const VARS = [
  "DATABASE_URL",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
];

export async function GET() {
  const report: Record<string, unknown> = {};

  for (const name of VARS) {
    const value = process.env[name];
    if (value === undefined) {
      report[name] = "MISSING";
      continue;
    }
    const badChars: Array<{ index: number; code: number; char: string }> = [];
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code > 255) badChars.push({ index: i, code, char: value[i] });
    }
    report[name] = {
      length: value.length,
      badChars,
    };
  }

  report["nodeVersion"] = process.version;
  report["platform"] = process.platform;
  report["envKeysWithNonAscii"] = Object.entries(process.env)
    .filter(([, v]) => v && [...v].some((c) => c.charCodeAt(0) > 255))
    .map(([k]) => k);

  return NextResponse.json(report);
}
