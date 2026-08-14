import { redirect } from "next/navigation";

// The Editor's Notes and Talk-to-Editor used to share one tab (this one).
// They're now separate tabs — /editor/notes and /editor/talk — so old
// links to plain /editor just forward to the Notes tab.
export default async function EditorPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  redirect(`/${bookId}/editor/notes`);
}
