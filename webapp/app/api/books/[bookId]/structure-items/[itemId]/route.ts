import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookBySlugOrNull } from "@/lib/getBook";
import { acceptProposalItem, rejectProposalItem } from "@/lib/editor";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string; itemId: string }> }
) {
  const { bookId, itemId } = await ctx.params;
  const book = await getBookBySlugOrNull(bookId);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const item = await prisma.structureProposalItem.findUnique({
    where: { id: itemId },
    include: { proposal: true },
  });
  if (!item || item.proposal.bookId !== book.id) {
    return NextResponse.json({ error: "Proposal item not found" }, { status: 404 });
  }

  const { status } = (await req.json()) as { status?: "accepted" | "rejected" };
  if (status !== "accepted" && status !== "rejected") {
    return NextResponse.json({ error: "status must be 'accepted' or 'rejected'" }, { status: 400 });
  }

  if (status === "accepted") await acceptProposalItem(itemId);
  else await rejectProposalItem(itemId);

  return NextResponse.json({ ok: true });
}
