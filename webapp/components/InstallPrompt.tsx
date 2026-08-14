"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

export function InstallPrompt() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();
  const [helpText, setHelpText] = useState<string | null>(null);

  async function handleInstall() {
    const result = await promptInstall();
    if (result === "ios-instructions") {
      setHelpText('Tap the ••• icon in the toolbar, then Share, then "Add to Home Screen".');
    } else if (result === "safari-instructions") {
      setHelpText('Click the Share icon in Safari\'s toolbar, then "Add to Dock".');
    }
  }

  if (!canInstall) return null;

  return (
    <div className="mx-5 md:mx-10 mt-3 rounded-xl border border-gold-soft bg-gold-soft/30 px-4 py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        {!helpText ? (
          <>
            <div className="text-sm text-ink font-medium">Install app</div>
            <p className="text-xs text-ink-soft mt-0.5">
              One tap, and it lives on your home screen like a real app.
            </p>
            <button
              onClick={handleInstall}
              className="mt-2 text-xs font-medium text-gold-deep hover:underline"
            >
              Install
            </button>
          </>
        ) : (
          <p className="text-xs text-ink-soft">{helpText}</p>
        )}
      </div>
      <button onClick={dismiss} className="text-ink-soft/60 hover:text-ink-soft text-xs shrink-0">
        ✕
      </button>
    </div>
  );
}
