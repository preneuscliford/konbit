"use client";

import { useEffect, useState } from "react";

// Petits messages en bas de l'écran (« Mèsi », erreurs…), comme les toasts de l'app.
type Toast = { id: number; message: string; tone: "info" | "error" };
type Listener = (toast: Toast) => void;

const listeners = new Set<Listener>();
let nextId = 1;

export function toast(message: string, tone: Toast["tone"] = "info") {
  const item = { id: nextId++, message, tone };
  listeners.forEach((l) => l(item));
}

export default function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const listener: Listener = (item) => {
      setItems((list) => [...list.slice(-2), item]);
      setTimeout(
        () => setItems((list) => list.filter((t) => t.id !== item.id)),
        3500,
      );
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      {items.map((t) => (
        <p
          key={t.id}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg ${
            t.tone === "error" ? "bg-brand-red" : "bg-brand"
          }`}
        >
          {t.message}
        </p>
      ))}
    </div>
  );
}
