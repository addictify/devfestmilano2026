// DevFest Milano 2026 service worker.
//
// Offline shell, plus pages you've actually visited — the venue has patchy
// signal on the day, and an attendee who opened the agenda over wifi should
// still be able to read it in a basement track room.
const CACHE_VERSION = "devfest-v2";
const OFFLINE_URL = "/offline";
const OFFLINE_URL_SLASH = "/offline/";

// Personal or privileged surfaces are never written to the cache: the store is
// per-browser, not per-account, so a cached copy would outlive sign-out and
// could be read by the next person on a shared phone.
const PRIVATE_PATHS = ["/admin", "/my-schedule", "/play"];

function isPrivate(pathname) {
  // Locale-prefixed: /it/admin, /en/my-schedule, …
  const withoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  return PRIVATE_PATHS.some(
    (p) => withoutLocale === p || withoutLocale.startsWith(p + "/"),
  );
}

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

  // Navigations: network-first, keeping a copy so a page you've already opened
  // survives losing signal. Falls back to that copy, then to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok && !isPrivate(url.pathname)) {
            const cache = await caches.open(CACHE_VERSION);
            // Not awaited: caching must never delay the response.
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return (
            (await caches.match(request, { ignoreSearch: true })) ||
            (await caches.match(OFFLINE_URL)) ||
            (await caches.match(OFFLINE_URL_SLASH)) ||
            Response.error()
          );
        }
      })()
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

// ---------------------------------------------------------------------------
// Web Push: reminders for the talks you saved, and announcements from the
// organizers during the day.

self.addEventListener("push", (event) => {
  // A push with no readable payload still has to show something: the
  // permission was granted on the promise that every push is user-visible, and
  // Chrome posts its own "site updated in the background" notice otherwise.
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "DevFest Milano";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      // `tag` collapses: a newer announcement replaces an unread one instead of
      // stacking, and a session can never buzz twice.
      tag: payload.tag || "devfest",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Reuse a tab that is already open rather than piling up windows on a
      // phone someone is holding in a corridor.
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
