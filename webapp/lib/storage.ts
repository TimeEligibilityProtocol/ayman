import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Local disk (public/uploads) is the zero-setup default for local dev.
// When R2 credentials are present (production / Render), we upload to
// Cloudflare R2 instead — same interface either way, callers don't care.
function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

function getR2Client(accountId: string, accessKeyId: string, secretAccessKey: string) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function saveAudioFile(
  bookSlug: string,
  storyId: string,
  buffer: Buffer,
  extension: string
): Promise<string> {
  const key = `${bookSlug}/${storyId}.${extension}`;
  const r2 = r2Config();

  if (r2) {
    const client = getR2Client(r2.accountId, r2.accessKeyId, r2.secretAccessKey);
    await client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: buffer,
        ContentType: `audio/${extension === "m4a" ? "mp4" : extension}`,
      })
    );
    return `${r2.publicUrl.replace(/\/$/, "")}/${key}`;
  }

  const dir = path.join(process.cwd(), "public", "uploads", bookSlug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${storyId}.${extension}`), buffer);
  return `/uploads/${bookSlug}/${storyId}.${extension}`;
}

export async function deleteAudioFile(url: string): Promise<void> {
  const r2 = r2Config();

  if (r2 && url.startsWith(r2.publicUrl)) {
    const key = url.slice(r2.publicUrl.replace(/\/$/, "").length + 1);
    const client = getR2Client(r2.accountId, r2.accessKeyId, r2.secretAccessKey);
    await client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key })).catch(() => {});
    return;
  }

  if (url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", url);
    await fs.unlink(filePath).catch(() => {});
  }
}
