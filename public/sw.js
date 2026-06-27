// DevFest Milano 2026 service worker. Conservative: offline shell only.
const CACHE_VERSION = "devfest-v1";
const OFFLINE_URL = "/offline";
const OFFLINE_URL_SLASH = "/offline/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // Resilient precache: one failed URL must not abort install. Both
      // /offline and /offline/ are attempted (static export uses trailingSlash).
      await Promise.allSettled(
        [OFFLINE_URL, OFFLINE_URL_SLASH, "/icons/icon-192.png"].map((u) =>
          cache.add(u)
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;        // third-party: passthrough
  if (url.pathname.startsWith("/api/")) return;            // never cache APIs

  // Navigations: network-first, fall back to cached offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.match(OFFLINE_URL)) ||
        (await caches.match(OFFLINE_URL_SLASH)) ||
        Response.error()
      )
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons") ||
      /\.(?:png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached || Response.error());
        return cached || network;
      })
    );
  }
});
