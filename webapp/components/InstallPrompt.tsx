"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

export function InstallPrompt() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  async function handleInstall() {
    const result = await promptInstall();
    if (result === "ios-instructions") setShowIOSHelp(true);
  }

  if (!canInstall || dismissed) return null;

  return (
    <div className="mx-5 md:mx-10 mt-3 rounded-xl border border-gold-soft bg-gold-soft/30 px-4 py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        {!showIOSHelp ? (
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
          <p className="text-xs text-ink-soft">
            Tap the <strong>•••</strong> icon in the toolbar, then <strong>Share</strong>, then{" "}
            <strong>&quot;Add to Home Screen&quot;</strong>.
          </p>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-ink-soft/60 hover:text-ink-soft text-xs shrink-0"
      >
        ✕
      </button>
    </div>
  );
}
