"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchUnreadCount } from "@/lib/notifications";

// Nombre de notifications non lues, partagé par la cloche de la barre latérale,
// les onglets mobiles et la page des notifications. Rafraîchi chaque minute et
// quand on revient sur l'onglet.
let count = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setUnreadCount(next: number) {
  count = next;
  emit();
}

export async function refreshUnreadCount() {
  try {
    setUnreadCount(await fetchUnreadCount());
  } catch {
    // Hors ligne : on garde la dernière valeur.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Un seul minuteur, même si plusieurs pastilles sont affichées
// (barre latérale + onglets mobiles).
let pollers = 0;
let stopPolling: (() => void) | null = null;

function startPolling() {
  pollers += 1;
  if (pollers === 1) {
    void refreshUnreadCount();
    const timer = setInterval(() => void refreshUnreadCount(), 60_000);
    const onFocus = () => void refreshUnreadCount();
    window.addEventListener("focus", onFocus);
    stopPolling = () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }
  return () => {
    pollers -= 1;
    if (pollers === 0) {
      stopPolling?.();
      stopPolling = null;
    }
  };
}

export function useUnreadCount(): number {
  const { userId } = useAuth();
  const value = useSyncExternalStore(
    subscribe,
    () => count,
    () => 0,
  );

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    return startPolling();
  }, [userId]);

  return userId ? value : 0;
}
