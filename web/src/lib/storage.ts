// Adresses publiques des fichiers (photos des konbits, avatars, couvertures).
// Sans dépendance serveur : utilisable dans les composants client.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const mediaUrl = (path: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/konbit-media/${path}`;
export const profileImageUrl = (path: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
