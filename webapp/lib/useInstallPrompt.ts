"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALLED_KEY = "ayman-installed-v3";

/**
 * Backs the always-present small install icon (header/sidebar) — no
 * dismissable banner anymore, so there's nothing to nag with and nothing
 * to permanently hide. It simply disappears once `installed` is true.
 *
 * Deliberately simple: localStorage only, scoped to THIS browsing context.
 * iOS confirmed (Apple/WebKit) isolates storage between Safari and a
 * standalone home-screen PWA — no client-side trick reliably bridges that
 * without a real server-side account system, which this app doesn't have.
 * Practical effect: on iOS the icon can't detect an install that happened
 * via the manual steps, so it stays — a quiet icon staying is a much
 * smaller cost than a banner that won't go away.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafariDesktop, setIsSafariDesktop] = useState(false);
  const [installed, setInstalled] = useState(true); // start true (hidden) until we know

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (standalone) {
      localStorage.setItem(INSTALLED_KEY, "1");
      setInstalled(true);
      return;
    }

    if (localStorage.getItem(INSTALLED_KEY) === "1") {
      setInstalled(true);
      return;
    }

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    // Safari desktop: has "Safari" but not "Chrome"/"Chromium"/"Edg" (those
    // also contain "Safari" in their UA string), and isn't mobile.
    const safariDesktop = !ios && /safari/i.test(ua) && !/chrome|chromium|edg/i.test(ua);
    setIsIOS(ios);
    setIsSafariDesktop(safariDesktop);
    setInstalled(false);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      localStorage.setItem(INSTALLED_KEY, "1");
      setInstalled(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function promptInstall(): Promise<"prompted" | "ios-instructions" | "safari-instructions" | "unavailable"> {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") {
        localStorage.setItem(INSTALLED_KEY, "1");
        setInstalled(true);
      }
      return "prompted";
    }
    // iOS/Safari desktop give no way to detect that the manual steps were
    // actually completed — so the icon just stays available; clicking it
    // again only re-shows the same instructions, which is harmless.
    if (isIOS) return "ios-instructions";
    if (isSafariDesktop) return "safari-instructions";
    return "unavailable";
  }

  const canInstall = !installed && (!!deferredPrompt || isIOS || isSafariDesktop);

  return { installed, isIOS, isSafariDesktop, canInstall, promptInstall };
}
