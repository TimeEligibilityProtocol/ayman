import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const getBookBySlug = cache(async (slug: string) => {
  const book = await prisma.book.findUnique({ where: { slug } });
  if (!book) notFound();
  return book;
});

export function getBookBySlugOrNull(slug: string) {
  return prisma.book.findUnique({ where: { slug } });
}
