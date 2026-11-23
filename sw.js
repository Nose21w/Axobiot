// Service worker: guarda una copia del juego en el celular
// para que funcione SIN internet (como una app instalada).
// 💡 Cada vez que cambies el juego, sube el número de versión
// para que los celulares descarguen la nueva.
const VERSION = "axobiot-v1";
const ARCHIVOS = [
  "./",
  "./index.html",
  "./main.js",
  "./lib/kaplay.js",
  "./manifest.json",
  "./iconos/icono-192.png",
  "./iconos/icono-512.png",
  "./iconos/icono-180.png",
];

// Al instalarse: descarga y guarda todos los archivos
self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ARCHIVOS)));
  self.skipWaiting();
});

// Al activarse: borra las copias de versiones viejas
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== VERSION).map((n) => caches.delete(n))),
    ),
  );
  self.clients.claim();
});

// Al pedir un archivo: primero intenta internet (para tener lo más nuevo);
// si no hay conexión, usa la copia guardada.
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;
  evento.respondWith(
    fetch(evento.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(VERSION).then((cache) => cache.put(evento.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(evento.request, { ignoreSearch: true })),
  );
});
