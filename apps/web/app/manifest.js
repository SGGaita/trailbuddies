import { colors } from "@trailbuddies/tokens";

export default function manifest() {
  return {
    id: "/",
    name: "Trailbuddies",
    short_name: "Trailbuddies",
    description: "Learning trails with a buddy by your side. Works offline.",
    start_url: "/play",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: colors.cream,
    theme_color: colors.leaf.deep,
    categories: ["education", "kids"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
