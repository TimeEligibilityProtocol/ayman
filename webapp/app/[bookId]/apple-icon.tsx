import { ImageResponse } from "next/og";
import { getBookBySlugOrNull } from "@/lib/getBook";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getBookBySlugOrNull(bookId);
  const letter = (book?.displayName || bookId).trim().charAt(0).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#241e36",
        }}
      >
        <div style={{ fontSize: 96, color: "#c39b5c", fontFamily: "Georgia, serif" }}>{letter}</div>
      </div>
    ),
    { ...size }
  );
}
