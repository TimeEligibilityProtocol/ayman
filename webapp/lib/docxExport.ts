import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
} from "docx";
import { prisma } from "@/lib/prisma";

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Raw Recordings export — every Story, verbatim (original + EN + AR),
 * regardless of book structure. Lives on the My Stories tab: whatever has
 * been recorded so far, always downloadable as-is.
 */
export async function buildRawRecordingsDocx(bookId: string): Promise<Buffer> {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  const allStories = await prisma.story.findMany({
    where: { bookId },
    orderBy: { createdAt: "asc" },
  });

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${book.displayName}'s Recordings`, font: "EB Garamond" })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  if (allStories.length === 0) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: "No stories yet.", italics: true })] })
    );
  }

  for (const story of allStories) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        text: `${story.title || "Untitled story"} — ${formatDate(story.createdAt)}`,
      })
    );
    if (story.transcriptOriginal) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: "Original transcript", bold: true })] }),
        new Paragraph({ text: story.transcriptOriginal })
      );
    }
    if (story.transcriptEnglish) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: "English", bold: true })] }),
        new Paragraph({ text: story.transcriptEnglish })
      );
    }
    if (story.transcriptArabic) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: "Arabic", bold: true })] }),
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: story.transcriptArabic, font: "Amiri" })],
        })
      );
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

/**
 * Manuscript export — only the book as it's currently taking shape: Parts
 * > Chapters > Threads, each Story shown as its approved text (or raw
 * transcript, clearly marked, if not yet approved). Lives on the My Book
 * tab. Never includes stories that don't belong to any structure yet —
 * those are still "raw", not manuscript.
 */
export async function buildManuscriptDocx(bookId: string): Promise<Buffer> {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  const parts = await prisma.part.findMany({
    where: { bookId },
    orderBy: { order: "asc" },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: { threads: { include: { stories: { orderBy: { createdAt: "asc" } } } } },
      },
    },
  });

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: book.title || `${book.displayName}'s Book`, font: "EB Garamond" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `by ${book.displayName}`, italics: true, font: "EB Garamond" })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  if (parts.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "No manuscript structure yet — ask your Editor to see the shape of the book.",
            italics: true,
          }),
        ],
      })
    );
  }

  for (const part of parts) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: part.title }));
    for (const chapter of part.chapters) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: chapter.title }));
      for (const thread of chapter.threads) {
        for (const story of thread.stories) {
          children.push(...storyBodyParagraphs(story));
        }
      }
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

function storyBodyParagraphs(story: { title: string | null; approvedText: string | null; transcriptOriginal: string | null; approvalState: string }) {
  const paragraphs: Paragraph[] = [];
  paragraphs.push(
    new Paragraph({ heading: HeadingLevel.HEADING_3, text: story.title || "Untitled story" })
  );
  const text = story.approvedText || story.transcriptOriginal || "";
  if (story.approvalState !== "approved") {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: "(not yet approved — showing raw transcript)", italics: true })],
      })
    );
  }
  paragraphs.push(new Paragraph({ text }));
  return paragraphs;
}
