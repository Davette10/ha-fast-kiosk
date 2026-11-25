/* echo-fast service worker (scope /local/echo/): version.txt and index.html always come from the network (cached copy only when HA is unreachable); everything else uses the normal browser cache. */
const C = "echo-fast-sw-1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== "GET") return;
  if (u.pathname === "/local/echo/version.txt" || u.pathname === "/local/echo/index.html") {
    e.respondWith(fetch(e.request, { cache: "no-cache" }).then((r) => { if (r.ok) { const k = r.clone(); caches.open(C).then((c) => c.put(u.pathname, k)); } return r; }).catch(() => caches.match(u.pathname)));
  }
});
