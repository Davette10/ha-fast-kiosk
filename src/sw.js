/* ha-fast-kiosk service worker: the small files that decide what loads are always fetched fresh (cached copy only when HA is
   unreachable). Everything else uses the browser's normal cache. */
const C = "ha-fast-kiosk-sw-1";
const BASE = new URL(".", self.location.href).pathname;
const FRESH = ["index.html", "version.txt", "config.json"].map((f) => BASE + f);
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== "GET" || !FRESH.includes(u.pathname)) return;
  e.respondWith(fetch(e.request, { cache: "no-cache" })
    .then((r) => { if (r.ok) { const k = r.clone(); caches.open(C).then((c) => c.put(u.pathname, k)); } return r; })
    .catch(() => caches.match(u.pathname)));
});
