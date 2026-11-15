import type { MetadataRoute } from "next";

// Manifeste web : nom, couleurs et icônes quand on ajoute le site à l'écran
// d'accueil d'un téléphone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Konbit 509",
    short_name: "Konbit 509",
    description:
      "Konbits, entraide et commerces locaux : Haïti et la diaspora, ensemble.",
    start_url: "/konbit",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#00209f",
    lang: "ht",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
