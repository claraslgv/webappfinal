// Service worker do .parágrafo — cache do "app shell" pra abrir/funcionar offline depois da
// primeira visita (ver pendência "PWA / instalável" em pendencias.txt). Registrado por
// app.js ("PWA / instalável — módulo 21"). Estratégia simples, pensada pro tamanho e ritmo
// de mudança deste app (sem build/bundler, sem hash nos nomes de arquivo):
//
//   - Navegação (a própria página, index.html): network-first — tenta buscar a versão nova
//     primeiro, pra nunca prender alguém numa versão velha do app enquanto há internet; cai
//     pro cache só se a rede falhar de verdade (offline).
//   - CSS/JS/ícones/manifest do próprio app: cache-first — raramente mudam de nome, e toda
//     vez que CACHE_VERSION sobe o passo "activate" abaixo apaga o cache da versão anterior
//     inteiro, então uma resposta velha nunca fica presa pra sempre.
//   - Google Fonts (CSS + arquivos de fonte, outra origem): stale-while-revalidate — serve
//     do cache na hora (não trava esperando rede) e atualiza por trás pra próxima vez.
//   - Qualquer outra origem (Supabase Auth/REST/Edge Functions) e qualquer método que não
//     seja GET: direto na rede, sem passar pelo cache — são sempre dados vivos.
//
// Pra publicar uma atualização de verdade depois de mexer no app shell (não só editar texto
// de uma tela), suba o número de CACHE_VERSION — isso invalida o cache antigo inteiro no
// próximo "activate" (a troca de service worker só acontece quando todas as abas do app
// forem fechadas e reabertas, comportamento padrão do navegador).

var CACHE_VERSION = "v3";
var CACHE_NAME = "paragrafo-" + CACHE_VERSION;

var APP_SHELL = [
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./assets/linen-brown.jpeg",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-192.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function isGoogleFonts(url) {
  return url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return; // POST etc. (Supabase) sempre direto na rede, sem cache

  var url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(function (resp) {
          var copy = resp.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put("./index.html", copy); });
          return resp;
        })
        .catch(function () { return caches.match("./index.html"); })
    );
    return;
  }

  if (isGoogleFonts(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(req).then(function (cached) {
          var fetchPromise = fetch(req)
            .then(function (resp) { if (resp.ok) cache.put(req, resp.clone()); return resp; })
            .catch(function () { return cached; });
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        return cached || fetch(req).then(function (resp) {
          if (resp.ok) {
            var copy = resp.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
          }
          return resp;
        });
      })
    );
  }
});
