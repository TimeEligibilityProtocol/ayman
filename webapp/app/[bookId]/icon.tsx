import { ImageResponse } from "next/og";
import { getBookBySlugOrNull } from "@/lib/getBook";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon({ params }: { params: Promise<{ bookId: string }> }) {
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
        <div style={{ fontSize: 20, color: "#c39b5c", fontFamily: "Georgia, serif" }}>{letter}</div>
      </div>
    ),
    { ...size }
  );
}
