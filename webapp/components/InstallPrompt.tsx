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
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);
    setDismissed(false);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    // Only hides for the current visit — reappears next time until the app
    // is actually installed. Ola wants it always there until real install.
    setDismissed(true);
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") setInstalled(true);
    } else if (isIOS) {
      setShowIOSHelp(true);
    }
  }

  if (installed || dismissed || (!deferredPrompt && !isIOS)) return null;

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
      <button onClick={dismiss} className="text-ink-soft/60 hover:text-ink-soft text-xs shrink-0">
        ✕
      </button>
    </div>
  );
}
