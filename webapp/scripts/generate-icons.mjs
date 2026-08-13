import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#241e36"/>
  <text x="256" y="345" font-family="Georgia, 'Times New Roman', serif" font-size="300" font-weight="600"
        fill="#c39b5c" text-anchor="middle">A</text>
</svg>`;

const sizes = [192, 512];
for (const size of sizes) {
  await sharp(Buffer.from(svg(size))).resize(size, size).png().toFile(path.join(outDir, `icon-${size}.png`));
}
await sharp(Buffer.from(svg(180))).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));

console.log("Icons generated in public/icons/");
