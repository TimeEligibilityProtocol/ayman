import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";

const STRING_FIELDS = ["bookForm", "structurePreference"] as const;
const LIST_FIELDS = [
  "voiceNotes",
  "acceptedThemes",
  "rejectedThemes",
  "titlePreferences",
  "hardConstraints",
  "acceptedStructureIdeas",
  "rejectedStructureIdeas",
] as const;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const intent = await prisma.bookIntent.findUnique({ where: { bookId: book.id } });
  return NextResponse.json({ intent });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const field of STRING_FIELDS) {
    if (typeof body[field] === "string") data[field] = body[field];
  }
  for (const field of LIST_FIELDS) {
    if (Array.isArray(body[field]) && body[field].every((v) => typeof v === "string")) {
      data[field] = body[field];
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const intent = await prisma.bookIntent.upsert({
    where: { bookId: book.id },
    update: data,
    create: { bookId: book.id, ...data },
  });
  return NextResponse.json({ intent });
}
