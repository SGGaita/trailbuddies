/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship plain ES modules; let Next compile them.
  transpilePackages: [
    "@trailbuddies/content",
    "@trailbuddies/domain",
    "@trailbuddies/i18n",
    "@trailbuddies/sync",
    "@trailbuddies/tokens",
  ],
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
