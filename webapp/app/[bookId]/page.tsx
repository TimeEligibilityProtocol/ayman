import { redirect } from "next/navigation";

// A bare panel link (e.g. storywithin.you/soulaf, no /tell) has nothing to
// render on its own — forward it to the Tell tab, same as the root page
// does for /ayman.
export default async function BookRootPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  redirect(`/${bookId}/tell`);
}
