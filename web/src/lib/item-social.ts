import { getSupabase } from "./supabase/client";

// Articles du katalòg : J'aime (publics) et vues (privées). Règle d'une vue :
// page de l'article ouverte, ou carte visible au moins à moitié pendant 1 s
// (norme IAB/MRC) ; la base compte chaque personne au plus une fois par jour
// et ignore le propriétaire (record_item_views).

const DEVICE_KEY = "konbit-device";

// Identifiant de cet appareil pour les visiteurs sans compte (navigateur).
function deviceId(): string | null {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// Vues envoyées par petits paquets ; une seule fois par article et par visite.
const sent = new Set<number>();
const queue: number[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const items = queue.splice(0, 50);
  if (items.length === 0) return;
  void getSupabase()
    .rpc("record_item_views", { items, device: deviceId() })
    .then(
      () => {},
      () => {},
    );
  if (queue.length) timer = setTimeout(flush, 0);
}

export function recordItemView(itemId: number) {
  if (sent.has(itemId)) return;
  sent.add(itemId);
  queue.push(itemId);
  timer ??= setTimeout(flush, 1500);
}

export async function fetchMyItemLikes(
  userId: string,
  itemIds: number[],
): Promise<Set<number>> {
  if (itemIds.length === 0) return new Set();
  const { data } = await getSupabase()
    .from("business_item_likes")
    .select("item_id")
    .eq("user_id", userId)
    .in("item_id", itemIds);
  return new Set((data ?? []).map((r) => r.item_id as number));
}

export async function setItemLike(
  itemId: number,
  userId: string,
  like: boolean,
) {
  const supabase = getSupabase();
  const { error } = like
    ? await supabase.from("business_item_likes").insert({ item_id: itemId })
    : await supabase
        .from("business_item_likes")
        .delete()
        .eq("item_id", itemId)
        .eq("user_id", userId);
  if (error && error.code !== "23505") throw error;
}

export interface ItemViewStats {
  total: number;
  week: number;
}

// Propriétaire : vues de chaque article de sa fiche.
export async function fetchItemViewStats(
  businessId: number,
): Promise<Map<number, ItemViewStats>> {
  const { data, error } = await getSupabase().rpc("item_view_stats", {
    target_business: businessId,
  });
  if (error) throw error;
  return new Map(
    (
      (data ?? []) as {
        item_id: number;
        views_total: number;
        views_7d: number;
      }[]
    ).map((r) => [
      r.item_id,
      { total: Number(r.views_total), week: Number(r.views_7d) },
    ]),
  );
}
