"use client";

import { useEffect, useRef, useState } from "react";
import { MicIcon } from "@/components/icons";

type Phase = "idle" | "recording" | "uploading" | "done" | "error";

function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return undefined;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TellRecorder({ bookId }: { bookId: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [resultTitle, setResultTitle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => handleStop(mimeType || "audio/webm");
      mediaRecorderRef.current = recorder;
      recorder.start();

      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setPhase("recording");
    } catch {
      setErrorMessage("Couldn't access the microphone. Check your browser permissions.");
      setPhase("error");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setPhase("uploading");
  }

  async function handleStop(mimeType: string) {
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const form = new FormData();
    const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
    form.append("audio", blob, `story.${ext}`);

    try {
      const res = await fetch(`/api/books/${bookId}/stories`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResultTitle(data.story?.title || "Your story");
      setPhase("done");
      setTimeout(() => {
        setPhase("idle");
        setResultTitle(null);
      }, 3500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 md:py-24">
      <h1 className="font-serif text-3xl md:text-4xl text-ink mb-3">What&apos;s your story today?</h1>
      <p className="text-ink-soft mb-14 max-w-xs">Every story matters. Let&apos;s capture it.</p>

      <button
        onClick={phase === "recording" ? stopRecording : phase === "idle" || phase === "error" || phase === "done" ? startRecording : undefined}
        disabled={phase === "uploading"}
        className={`relative flex items-center justify-center w-36 h-36 rounded-full transition-all ${
          phase === "recording" ? "bg-gold-deep animate-pulse" : "bg-gold"
        } ${phase === "uploading" ? "opacity-60" : "hover:brightness-105"} shadow-lg shadow-gold-soft/40`}
      >
        <MicIcon className="w-12 h-12 text-navy" />
      </button>

      <div className="mt-6 h-6 text-sm text-ink-soft">
        {phase === "idle" && "Tap to record"}
        {phase === "recording" && `Recording… ${formatTime(seconds)} · tap to stop`}
        {phase === "uploading" && "Transcribing your story…"}
        {phase === "done" && `Saved — "${resultTitle}". Your Editor is thinking about it.`}
        {phase === "error" && errorMessage}
      </div>
    </div>
  );
}
