"use client";

import { useRef, useState } from "react";
import { PlayIcon } from "@/components/icons";

export function StoryListItem({
  title,
  timeLabel,
  audioUrl,
  href,
}: {
  title: string;
  timeLabel: string;
  audioUrl: string | null;
  href?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }

  const Wrapper = href ? "a" : "div";

  return (
    <Wrapper
      href={href}
      className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-b-0"
    >
      <div className="min-w-0">
        <div className="text-ink truncate">{title}</div>
        <div className="text-xs text-ink-soft mt-0.5">{timeLabel}</div>
      </div>
      {audioUrl && (
        <>
          <button
            onClick={toggle}
            className="shrink-0 w-9 h-9 rounded-full bg-cream-soft border border-border flex items-center justify-center text-navy hover:bg-gold-soft/40"
            aria-label={playing ? "Pause" : "Play"}
          >
            <PlayIcon className="w-4 h-4 ml-0.5" />
          </button>
          <audio
            ref={audioRef}
            src={audioUrl}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        </>
      )}
    </Wrapper>
  );
}
