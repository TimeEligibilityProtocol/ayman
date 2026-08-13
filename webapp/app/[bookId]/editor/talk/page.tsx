import { prisma } from "@/lib/prisma";
import { getBookBySlug } from "@/lib/getBook";
import { EditorTalk } from "@/components/EditorTalk";

export default async function EditorTalkPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getBookBySlug(bookId);

  const [turns, notes] = await Promise.all([
    prisma.conversationTurn.findMany({ where: { bookId: book.id }, orderBy: { createdAt: "asc" } }),
    prisma.editorNote.findMany({
      where: { bookId: book.id, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <EditorTalk
      bookId={book.slug}
      initialTurns={turns.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() }))}
      initialNotes={notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
    />
  );
}
