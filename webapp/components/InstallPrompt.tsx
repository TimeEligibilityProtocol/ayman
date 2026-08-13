"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden until we know

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    if (localStorage.getItem("ayman-install-dismissed") === "1") return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);
    setDismissed(false);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("ayman-install-dismissed", "1");
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
      dismiss();
    } else if (isIOS) {
      setShowIOSHelp(true);
    }
  }

  if (dismissed || (!deferredPrompt && !isIOS)) return null;

  return (
    <div className="mx-5 md:mx-10 mt-3 rounded-xl border border-gold-soft bg-gold-soft/30 px-4 py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        {!showIOSHelp ? (
          <>
            <div className="text-sm text-ink font-medium">Install Ayman on your phone</div>
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
            Tap the <strong>Share</strong> icon in Safari&apos;s toolbar, then{" "}
            <strong>&quot;Add to Home Screen&quot;</strong>.
          </p>
        )}
      </div>
      <button onClick={dismiss} className="text-ink-soft/60 hover:text-ink-soft text-xs shrink-0">
        ✕
      </button>
    </div>
  );
}
