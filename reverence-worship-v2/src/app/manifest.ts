import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reverence Worship Team",
    short_name: "Reverence",
    description: "Reverence Worship Team mobile app.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/logo_title_icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
