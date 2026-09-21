/* Private pages are always checked by the server. Never cache authenticated HTML,
 * RSC payloads or API responses. Bumping this cache clears the old public shell. */
const CACHE = "horadia-private-v3";
const CORE = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("horadia-") && key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/") || CORE.includes(url.pathname)) {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {}); }
      return response;
    }).catch(async () => await caches.match(request) || new Response("Sin conexión", { status: 503 })));
  } else if (request.mode === "navigate") {
    event.respondWith(fetch(request, { cache: "no-store" }).catch(() => new Response(
      '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Horadia</title><body style="font-family:system-ui;padding:32px"><h1>Horadia</h1><p>Conéctate para abrir tu espacio privado. Tus datos siguen guardados en este dispositivo.</p><a href="/">Volver a intentar</a></body></html>',
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
    )));
  }
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
