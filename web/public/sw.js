/*
 * Minimal offline service worker for Horadia (§29 — must work offline).
 * Strategy: network-first for navigations and Next assets (so updates land),
 * falling back to the cache when offline; the app itself keeps all data in
 * localStorage so once loaded it is fully usable with no connection.
 */

const CACHE = "horadia-v2";
const CORE = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        return new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain" } });
      }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Horadia",
    body: "Tienes un recordatorio pendiente.",
    url: "/",
    tag: "horadia-reminder",
  };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const relativeUrl = event.notification.data?.url || "/";
  const targetUrl = new URL(relativeUrl, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (openClients) => {
        const client = openClients[0];
        if (client) {
          if ("navigate" in client) await client.navigate(targetUrl);
          return client.focus();
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
