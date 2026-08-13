import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
