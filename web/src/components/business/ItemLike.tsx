"use client";

import { useRef, useState } from "react";
import { HeartIcon } from "@/components/Icons";
import { toast } from "@/components/Toaster";
import { useRequireAccount } from "@/components/feed/useRequireAccount";
import { setItemLike } from "@/lib/item-social";

// Cœur d'un article du katalòg : le nombre de J'aime est public.
export default function ItemLike({
  itemId,
  count,
  liked,
  size = "sm",
}: {
  itemId: number;
  count: number;
  liked: boolean;
  size?: "sm" | "lg";
}) {
  const requireAccount = useRequireAccount();
  const [state, setState] = useState({ liked, count });
  const busy = useRef(false);

  // Nouvel état du parent (J'aime chargés après coup).
  const [source, setSource] = useState({ liked, count });
  if (source.liked !== liked || source.count !== count) {
    setSource({ liked, count });
    setState({ liked, count });
  }

  function toggle() {
    requireAccount(async (me) => {
      if (busy.current) return;
      busy.current = true;
      const on = !state.liked;
      setState((s) => ({
        liked: on,
        count: Math.max(0, s.count + (on ? 1 : -1)),
      }));
      try {
        await setItemLike(itemId, me, on);
      } catch {
        setState((s) => ({
          liked: !on,
          count: Math.max(0, s.count + (on ? -1 : 1)),
        }));
        toast("Nou pa ka fè sa kounye a. Eseye ankò.", "error");
      } finally {
        busy.current = false;
      }
    });
  }

  const big = size === "lg";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      aria-pressed={state.liked}
      aria-label={`Renmen: ${state.count}`}
      className={`group flex items-center gap-1.5 rounded-full font-semibold transition ${
        state.liked ? "text-brand-red" : "text-stone-500 hover:text-brand-red"
      } ${big ? "text-base" : "text-[13px]"}`}
    >
      <span
        className={`rounded-full group-hover:bg-red-50 ${big ? "p-2.5" : "p-1.5"}`}
      >
        <HeartIcon
          className={big ? "h-6 w-6" : "h-[18px] w-[18px]"}
          filled={state.liked}
        />
      </span>
      {state.count > 0 && state.count}
    </button>
  );
}
