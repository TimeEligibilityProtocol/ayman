import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

async function main() {
  // Dynamic import: static ESM imports are hoisted above the dotenv calls
  // above, which would run lib/prisma's DATABASE_URL check too early.
  const { prisma } = await import("../lib/prisma");

  const existing = await prisma.book.findUnique({ where: { slug: "ayman" } });
  if (existing) {
    console.log("Book 'ayman' already exists, skipping seed.");
    return;
  }

  const user = await prisma.user.create({ data: { name: "Ola" } });
  const book = await prisma.book.create({
    data: {
      slug: "ayman",
      userId: user.id,
      displayName: "Ayman",
    },
  });
  await prisma.storyMemory.create({
    data: { bookId: book.id, data: {} },
  });

  console.log(`Seeded book '${book.slug}' (${book.id}) for user ${user.name}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
