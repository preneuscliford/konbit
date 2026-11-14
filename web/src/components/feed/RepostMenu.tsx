"use client";

import { useEffect, useRef } from "react";
import { PencilIcon, RepostIcon } from "@/components/Icons";

// Petit menu du bouton 🔁 (comme X) : « Reposte » (ou « Anile repost la »)
// et « Site » (citer avec une légende). Pour les pòs, konbits et fiches.
export default function RepostMenu({
  reposted,
  onClose,
  onRepost,
  onQuote,
}: {
  reposted: boolean;
  onClose: () => void;
  onRepost: () => void;
  onQuote: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.parentElement?.contains(e.target as Node)) onClose();
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [onClose]);

  const item =
    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] font-bold hover:bg-stone-50";
  return (
    <div
      ref={ref}
      role="menu"
      className="absolute bottom-full left-0 z-30 mb-1 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-surface py-1 shadow-xl"
    >
      <button
        type="button"
        role="menuitem"
        onClick={onRepost}
        className={`${item} ${reposted ? "text-brand-red" : "text-stone-900"}`}
      >
        <RepostIcon className="h-5 w-5" />
        {reposted ? "Anile repost la" : "Reposte"}
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onQuote}
        className={`${item} text-stone-900`}
      >
        <PencilIcon className="h-5 w-5" />
        Site
      </button>
    </div>
  );
}
