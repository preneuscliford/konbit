import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";

// Articles du katalòg : J'aime (publics) et vues (privées). Une vue compte
// quand la page de l'article s'ouvre, ou quand sa carte reste visible au
// moins à moitié pendant 1 s (norme IAB/MRC) ; la base compte chaque personne
// au plus une fois par jour et ignore le propriétaire (record_item_views).

const DEVICE_KEY = "konbit-device";
let device: string | null = null;

// Identifiant de ce téléphone, pour compter les visiteurs sans compte.
async function deviceId(): Promise<string | null> {
  if (device) return device;
  try {
    device = await AsyncStorage.getItem(DEVICE_KEY);
    if (!device) {
      device = Crypto.randomUUID();
      await AsyncStorage.setItem(DEVICE_KEY, device);
    }
    return device;
  } catch {
    return null;
  }
}

// Vues envoyées par petits paquets ; une seule fois par article et par session.
const sent = new Set<number>();
const queue: number[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const items = queue.splice(0, 50);
  if (items.length === 0) return;
  try {
    await supabase.rpc("record_item_views", { items, device: await deviceId() });
  } catch {
    // Hors ligne : la vue est perdue, sans gêner l'utilisateur.
  }
  if (queue.length) timer = setTimeout(() => void flush(), 0);
}

export function recordItemView(itemId: number) {
  if (sent.has(itemId)) return;
  sent.add(itemId);
  queue.push(itemId);
  timer ??= setTimeout(() => void flush(), 1500);
}

export async function fetchMyItemLikes(userId: string, itemIds: number[]): Promise<number[]> {
  if (itemIds.length === 0) return [];
  const { data } = await supabase
    .from("business_item_likes")
    .select("item_id")
    .eq("user_id", userId)
    .in("item_id", itemIds);
  return (data ?? []).map((r) => r.item_id as number);
}

export async function setItemLike(itemId: number, userId: string, like: boolean) {
  const { error } = like
    ? await supabase.from("business_item_likes").insert({ item_id: itemId })
    : await supabase.from("business_item_likes").delete().eq("item_id", itemId).eq("user_id", userId);
  if (error && error.code !== "23505") throw error;
}

export interface ItemViewStats {
  total: number;
  week: number;
}

// Propriétaire : vues de chaque article de sa fiche.
export async function fetchItemViewStats(businessId: number): Promise<Record<number, ItemViewStats>> {
  const { data, error } = await supabase.rpc("item_view_stats", { target_business: businessId });
  if (error) throw error;
  const out: Record<number, ItemViewStats> = {};
  for (const r of (data ?? []) as { item_id: number; views_total: number; views_7d: number }[]) {
    out[r.item_id] = { total: Number(r.views_total), week: Number(r.views_7d) };
  }
  return out;
}
