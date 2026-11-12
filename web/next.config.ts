import path from "node:path";
import type { NextConfig } from "next";

const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co").hostname;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Photos des konbits et des profils (stockage public Supabase).
  images: {
    // En local, certains réseaux (NAT64 des partages 4G/5G) font passer Supabase
    // pour une IP privée et l'optimiseur refuse les images : on sert alors les
    // originaux. En production (Vercel), les images restent optimisées.
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
  },
  turbopack: {
    // Le site vit dans web/ à côté de l'app mobile (autre package-lock.json à la racine).
    root: path.resolve(process.cwd()),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
