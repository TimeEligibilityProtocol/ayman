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
 * Builds a .docx with two clearly separated sections, per Ola's requirement:
 * the composed manuscript (approved stories, in book structure order) and
 * the raw recordings/transcripts (every story, verbatim, EN + AR), so
 * nothing captured is ever locked away in the app.
 */
export async function buildBookDocx(bookId: string): Promise<Buffer> {
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
  const unplacedStories = await prisma.story.findMany({
    where: { bookId, threadId: null },
    orderBy: { createdAt: "asc" },
  });
  const allStories = await prisma.story.findMany({
    where: { bookId },
    orderBy: { createdAt: "asc" },
  });

  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: book.title || `${book.displayName}'s Book`, font: "EB Garamond" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `by ${book.displayName}`, italics: true, font: "EB Garamond" })],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Manuscript" })
  );

  const hasStructure = parts.length > 0;
  if (hasStructure) {
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
  }

  if (unplacedStories.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Unplaced Stories" }));
    for (const story of unplacedStories) {
      children.push(...storyBodyParagraphs(story));
    }
  }

  if (!hasStructure && unplacedStories.length === 0) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: "No stories yet.", italics: true })] })
    );
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Raw Recordings & Transcripts" })
  );

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
  const buffer = await Packer.toBuffer(doc);
  return buffer;
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
