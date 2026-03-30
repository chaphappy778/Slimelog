import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SlimeLog",
    short_name: "SlimeLog",
    description: "Rate it. Log it. Love it.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#39FF14",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
