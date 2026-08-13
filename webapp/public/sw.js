// Minimal service worker — just enough for "installable" PWA criteria.
// No offline caching yet; that's a reasonable follow-up once the app is stable.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
