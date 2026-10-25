// Serves /sw.js, the offline service worker (approach ported from Martha's Learning Corner).
// Generated at build time so the page list always matches the routes, and every deploy
// gets a fresh cache version.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getSubjects, ALL_ASSETS, ART_BASE } from "@trailbuddies/content";
import { PLAY_MORE, FAMILY, TEACH } from "@/lib/placeholders";

export const dynamic = "force-static";

const BUILD_ID = Date.now().toString(36);
const PAGES = [
  "/",
  "/play",
  "/play/map",
  "/play/buddies",
  "/start",
  ...getSubjects().map((s) => `/play/trail/${s.id}`),
  ...Object.keys(PLAY_MORE).map((k) => `/play/more/${k}`),
  "/play/more/shop",
  "/play/more/badges",
  "/play/more/games",
  "/play/more/island",
  "/play/custom",
  "/family/create",
  "/family/create/lesson",
  "/family/create/preview",
  "/family/progress",
  "/family",
  ...Object.keys(FAMILY).map((k) => `/family/${k}`),
  "/teach",
  ...Object.keys(TEACH).map((k) => `/teach/${k}`),
];
const EXTRAS = [
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/sounds/right.wav",
  "/sounds/miss.wav",
  "/sounds/done.wav",
  "/art/number-mountain.webp",
  "/art/number-mountain-sm.webp",
  "/art/letter-forest.webp",
  "/art/letter-forest-sm.webp",
  "/art/animal-safari.webp",
  "/art/animal-safari-sm.webp",
  // Approved unit illustrations that are in this build, so lessons look right offline.
  ...Object.values(ALL_ASSETS)
    .flatMap((m) => m.assets)
    .filter((a) => a.kind === "image" && a.review_status === "approved")
    .map((a) => ART_BASE + a.path)
    .filter((url) => existsSync(join(process.cwd(), "public", url))),
];

function worker(BUILD_ID, PAGES, EXTRAS) {
  const CACHE = "trailbuddies-" + BUILD_ID;
  const ASSET_RE = /\/_next\/static\/[^"'\s)\\<>]+/g;

  // Fetch every page, then every script/style/font those pages (and their CSS) reference.
  async function precacheAll() {
    const cache = await caches.open(CACHE);
    const assets = new Set(EXTRAS);
    for (const page of PAGES) {
      const res = await fetch(page, { cache: "reload" });
      if (!res.ok) throw new Error("precache failed: " + page);
      await cache.put(page, res.clone());
      (await res.text()).match(ASSET_RE)?.forEach((u) => assets.add(u));
    }
    for (const css of [...assets].filter((u) => u.endsWith(".css"))) {
      const res = await fetch(css, { cache: "reload" });
      if (!res.ok) continue;
      await cache.put(css, res.clone());
      (await res.text()).match(ASSET_RE)?.forEach((u) => assets.add(u));
    }
    await Promise.all(
      [...assets].map(async (u) => {
        if (await cache.match(u)) return;
        try {
          const r = await fetch(u, { cache: "reload" });
          if (r.ok) await cache.put(u, r);
        } catch {
          /* skip */
        }
      }),
    );
  }

  self.addEventListener("install", (e) => {
    e.waitUntil(precacheAll().then(() => self.skipWaiting()));
  });

  self.addEventListener("activate", (e) => {
    e.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((k) => k.startsWith("trailbuddies-") && k !== CACHE).map((k) => caches.delete(k)),
        );
        await self.clients.claim();
      })(),
    );
  });

  self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;
    // Sign-in and sync always go to the network; the app copes with being offline itself.
    if (url.pathname.startsWith("/api/")) return;

    // Pages: answer from cache instantly (works offline), refresh the copy in the background.
    if (req.mode === "navigate") {
      const path = url.pathname.replace(/\/$/, "") || "/";
      e.respondWith(
        (async () => {
          const cache = await caches.open(CACHE);
          const cached = await cache.match(path);
          const network = fetch(req)
            .then((r) => {
              if (r.ok) cache.put(path, r.clone());
              return r;
            })
            .catch(() => null);
          if (cached) {
            e.waitUntil(network);
            return cached;
          }
          return (await network) || (await cache.match("/play")) || Response.error();
        })(),
      );
      return;
    }

    // Build assets are content-hashed: cache first, forever.
    if (
      url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/art/")
    ) {
      e.respondWith(
        (async () => {
          const cache = await caches.open(CACHE);
          const hit = await cache.match(url.pathname);
          if (hit) return hit;
          const r = await fetch(req);
          if (r.ok) cache.put(url.pathname, r.clone());
          return r;
        })(),
      );
      return;
    }

    // Everything else: network first, cache fallback.
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone()));
          return r;
        })
        .catch(async () => (await caches.match(req, { ignoreSearch: true })) || Response.error()),
    );
  });
}

export function GET() {
  const body = `(${worker.toString()})(${JSON.stringify(BUILD_ID)}, ${JSON.stringify(PAGES)}, ${JSON.stringify(EXTRAS)});`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
