import { compress } from "./business-actions";
import { getSupabase } from "./supabase/client";

// Photos de profil et abonnements, avec la session du membre (règles RLS).

// Photo de profil petite, couverture plus large (comme l'app).
const SIDE = { avatar: 400, cover: 1500 } as const;

export async function uploadProfileImage(
  userId: string,
  file: File,
  kind: "avatar" | "cover",
): Promise<string> {
  const { blob } = await compress(file, SIDE[kind]);
  const path = `${userId}/${kind}-${Date.now()}.jpg`;
  const { error } = await getSupabase()
    .storage.from("avatars")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}

// Anciennes photos remplacées. Un échec ne bloque pas.
export async function removeProfileImages(paths: string[]) {
  if (!paths.length) return;
  await getSupabase()
    .storage.from("avatars")
    .remove(paths)
    .catch(() => {});
}

export async function isFollowing(meId: string, otherId: string) {
  const { data, error } = await getSupabase()
    .from("follows")
    .select("followee_id")
    .eq("follower_id", meId)
    .eq("followee_id", otherId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function follow(otherId: string) {
  const { error } = await getSupabase()
    .from("follows")
    .insert({ followee_id: otherId });
  // Déjà abonné : rien à faire.
  if (error && error.code !== "23505") throw error;
}

export async function unfollow(meId: string, otherId: string) {
  const { error } = await getSupabase()
    .from("follows")
    .delete()
    .eq("follower_id", meId)
    .eq("followee_id", otherId);
  if (error) throw error;
}
