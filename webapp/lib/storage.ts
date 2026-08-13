import fs from "node:fs/promises";
import path from "node:path";

// MVP: audio lives under public/uploads and is served directly by Next's
// static file handling. Fine for a single private tenant; once there are
// real multiple users this should move behind an authenticated route or
// object storage with signed URLs (see ai-book-editor-ayman-project memory).
export async function saveAudioFile(
  bookSlug: string,
  storyId: string,
  buffer: Buffer,
  extension: string
): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", bookSlug);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${storyId}.${extension}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/${bookSlug}/${filename}`;
}
