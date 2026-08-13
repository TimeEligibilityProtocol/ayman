import { TellRecorder } from "@/components/TellRecorder";

export default async function TellPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  return <TellRecorder bookId={bookId} />;
}
