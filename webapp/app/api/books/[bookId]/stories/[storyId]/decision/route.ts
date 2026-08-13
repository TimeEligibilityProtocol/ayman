import { NextRequest, NextResponse } from "next/server";
import { approveStory, setStoryDecision } from "@/lib/editor";

const VALID = ["approved", "exploring", "not_quite", "deferred"] as const;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string; storyId: string }> }
) {
  const { storyId } = await ctx.params;
  const { decision } = (await req.json()) as { decision: string };

  if (!VALID.includes(decision as (typeof VALID)[number])) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  if (decision === "approved") {
    const approvedText = await approveStory(storyId);
    return NextResponse.json({ approvedText });
  }

  await setStoryDecision(storyId, decision as "exploring" | "not_quite" | "deferred");
  return NextResponse.json({ ok: true });
}
