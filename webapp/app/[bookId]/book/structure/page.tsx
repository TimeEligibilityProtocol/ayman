import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBookBySlug } from "@/lib/getBook";
import { StructureTabs } from "@/components/StructureTabs";
import { BackIcon } from "@/components/icons";

export default async function StructurePage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getBookBySlug(bookId);
  const parts = await prisma.part.findMany({
    where: { bookId: book.id },
    orderBy: { order: "asc" },
    include: { chapters: { orderBy: { order: "asc" }, include: { threads: { include: { stories: true } } } } },
  });

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${book.slug}/book`} className="text-ink-soft hover:text-ink">
          <BackIcon className="w-5 h-5" />
        </Link>
        <h1 className="font-serif text-xl">Structure</h1>
      </div>

      <StructureTabs bookId={book.slug} parts={parts} />
    </div>
  );
}
