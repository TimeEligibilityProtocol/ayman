"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CACHE_NAME = "ayman-shared";
const FLAG_URL = "/__pwa-installed-flag";

// localStorage is confirmed isolated between Safari and a standalone
// home-screen PWA on iOS (same origin, different storage) — Apple/WebKit
// platform limitation, not something fixable in app code. Cache Storage is
// reported (by developers, not Apple docs) to sometimes be shared instead —
// this is an experiment to try that bridge, not a confirmed fix.
async function markInstalledEverywhere() {
  localStorage.setItem("ayman-installed", "1");
  try {
    if ("caches" in window) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(FLAG_URL, new Response("1"));
    }
  } catch {
    // Cache API unavailable or blocked — localStorage still covers the
    // current context.
  }
}

async function checkInstalledAnywhere(): Promise<boolean> {
  if (localStorage.getItem("ayman-installed") === "1") return true;
  try {
    if ("caches" in window) {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(FLAG_URL);
      if (match) {
        localStorage.setItem("ayman-installed", "1");
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Shared install-detection state, used by both the dismissable banner and
 * the always-present header install icon, so the two never disagree.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(true); // start true (hidden) until we know

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      if (standalone) {
        await markInstalledEverywhere();
        if (!cancelled) setInstalled(true);
        return;
      }

      const alreadyInstalled = await checkInstalledAnywhere();
      if (cancelled) return;
      if (alreadyInstalled) {
        setInstalled(true);
        return;
      }

      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
      setIsIOS(ios);
      setInstalled(false);
    }

    init();

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      markInstalledEverywhere();
      setInstalled(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function promptInstall(): Promise<"prompted" | "ios-instructions" | "unavailable"> {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") {
        await markInstalledEverywhere();
        setInstalled(true);
      }
      return "prompted";
    }
    if (isIOS) return "ios-instructions";
    return "unavailable";
  }

  const canInstall = !installed && (!!deferredPrompt || isIOS);

  return { installed, isIOS, canInstall, promptInstall };
}
