"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

// Always-visible install affordance next to the panel name, instead of
// relying only on the dismissable banner or the browser's own (sometimes
// absent) install icon — Ola specifically asked for this on desktop.
export function InstallIconButton({ className }: { className?: string }) {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [helpText, setHelpText] = useState<string | null>(null);

  if (!canInstall) return null;

  async function handleClick() {
    const result = await promptInstall();
    if (result === "ios-instructions") {
      setHelpText('Tap the ••• icon in the toolbar, then Share, then "Add to Home Screen".');
    } else if (result === "safari-instructions") {
      setHelpText('Click the Share icon in Safari\'s toolbar, then "Add to Dock".');
    }
  }

  return (
    <span className="relative inline-block">
      <button
        onClick={handleClick}
        title="Install app"
        aria-label="Install app"
        className={className}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4">
          <path d="M12 4v11m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {helpText && (
        <div className="absolute left-0 top-full mt-2 w-56 rounded-lg border border-border bg-card p-3 text-xs text-ink-soft shadow-lg z-10">
          {helpText}
          <button onClick={() => setHelpText(null)} className="block mt-2 text-gold-deep hover:underline">
            Got it
          </button>
        </div>
      )}
    </span>
  );
}
