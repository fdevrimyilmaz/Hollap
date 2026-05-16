import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hollap Core",
    short_name: "Hollap",
    description: "Hollap.com MVP",
    start_url: "/teachers",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#0ea5e9",
  };
}
