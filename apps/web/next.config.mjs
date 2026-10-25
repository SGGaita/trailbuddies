import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Shown in "What's new" (OFF-06) and on error reports (SAF-07).
  env: {
    NEXT_PUBLIC_TB_VERSION: pkg.version,
    NEXT_PUBLIC_TB_RELEASE: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 12) || pkg.version,
  },
  reactStrictMode: true,
  // Workspace packages ship plain ES modules; let Next compile them.
  transpilePackages: [
    "@trailbuddies/api-client",
    "@trailbuddies/content",
    "@trailbuddies/domain",
    "@trailbuddies/i18n",
    "@trailbuddies/sync",
    "@trailbuddies/tokens",
  ],
  // The API sits behind the web app's own /api path, so the session cookie is
  // first-party on every device. TB_API_URL: http://localhost:8000 locally, the API
  // container in Docker, the VPS in production.
  async rewrites() {
    const api = (process.env.TB_API_URL || "http://localhost:8000").replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${api}/:path*` }];
  },
  async headers() {
    return [
      {
        // The service worker must never be cached, so a new deploy is picked up on the next visit.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
