/* Service worker: red primero para el código de la app (así las
   actualizaciones se ven al recargar) y caché como respaldo sin conexión.
   Incluye notificaciones push. */
const CACHE = "finanzas-v2";
const ASSETS = ["./", "./index.html", "./app.js", "./config.js", "./manifest.webmanifest",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const putInCache = (req, res) => {
  const clone = res.clone();
  caches.open(CACHE).then((c) => c.put(req, clone));
  return res;
};

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // Supabase y demás: directo a la red

  /* el código de la app siempre se busca primero en la red */
  const fresh = e.request.mode === "navigate"
    || url.pathname.endsWith("/")
    || /\/(app\.js|config\.js|index\.html)$/.test(url.pathname);

  if (fresh) {
    e.respondWith(
      fetch(e.request)
        .then((res) => putInCache(e.request, res))
        .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit ||
      fetch(e.request).then((res) => putInCache(e.request, res))
    )
  );
});

/* ---------- notificaciones push ---------- */
self.addEventListener("push", (e) => {
  let msg = { title: "Finanzas", body: "Tienes una notificación nueva" };
  try { Object.assign(msg, e.data.json()); } catch (err) {}
  e.waitUntil(self.registration.showNotification(msg.title, {
    body: msg.body,
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    data: { url: "./" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
      for (const w of ws) if ("focus" in w) return w.focus();
      return clients.openWindow("./");
    })
  );
});
