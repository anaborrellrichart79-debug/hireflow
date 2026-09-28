// Service worker de HireFlow (ver docs/decisions.md, entrada 042).
// Conservador a propósito: SOLO intercepta la navegación entre páginas, y
// solo para enseñar offline.html cuando no hay conexión. No guarda en caché
// el código de la app ni la API: así, tras un despliegue, nadie se queda con
// una versión vieja. Es lo que hace falta para que la app se pueda instalar y
// empaquetar para Android sin cambiar cómo funciona.

// Cambiar la versión cuando cambie cualquiera de los archivos de OFFLINE_ASSETS
const CACHE = "hireflow-offline-v2";
const OFFLINE_ASSETS = [
    "offline.html",
    "js/offlinePage.js",
    "style/notfound.css",
    "assets/mascota-soporte.svg",
    "assets/icons/favicon.svg"
];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)));
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    // Navegación: siempre a la red; sin red, la página "Sin conexión".
    // cache: "no-store" porque, sin conexión, el navegador podía devolver una
    // copia vieja de index.html de su caché HTTP pero no su CSS ni su JS, y
    // la página salía rota. Además, así siempre llega la versión desplegada.
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request.url, { cache: "no-store", credentials: "same-origin", redirect: "follow" })
                .catch(() => caches.match("offline.html"))
        );
        return;
    }

    // Los archivos de la página "Sin conexión": de la caché si no hay red
    const url = new URL(request.url);
    if (url.origin === self.location.origin && OFFLINE_ASSETS.some((asset) => url.pathname.endsWith(`/${asset}`))) {
        event.respondWith(fetch(request).catch(() => caches.match(request)));
    }
    // Todo lo demás (API incluida) pasa directamente, sin tocarlo
});
