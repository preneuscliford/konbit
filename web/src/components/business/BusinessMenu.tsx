"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRequireAccount } from "@/components/feed/useRequireAccount";
import { MoreIcon, ShareIcon } from "@/components/Icons";
import { toast } from "@/components/Toaster";
import {
  ABUSE_REASONS,
  konbitErrorMessage,
  reportAbuse,
  type AbuseReason,
} from "@/lib/konbit-actions";

// Actions sur une fiche : partager, modifier (propriétaire) ou signaler.
export default function BusinessMenu({
  businessId,
  ownerId,
  name,
}: {
  businessId: number;
  ownerId: string;
  name: string;
}) {
  const { userId } = useAuth();
  const requireAccount = useRequireAccount();
  const [open, setOpen] = useState<"closed" | "menu" | "report">("closed");
  const ref = useRef<HTMLDivElement>(null);
  const isOwner = userId === ownerId;

  useEffect(() => {
    if (open === "closed") return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen("closed");
    };
    const escape = (e: KeyboardEvent) =>
      e.key === "Escape" && setOpen("closed");
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share)
        await navigator.share({ title: `${name} sou Konbit 509`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Lyen an kopye.");
      }
    } catch {
      // Partage annulé.
    }
  }

  async function report(reason: AbuseReason) {
    setOpen("closed");
    try {
      await reportAbuse("business", businessId, reason);
      toast("Mèsi. N ap gade sa.");
    } catch (e) {
      toast(konbitErrorMessage(e), "error");
    }
  }

  const item =
    "block w-full px-4 py-2.5 text-left text-[15px] font-semibold text-stone-800 hover:bg-stone-50";

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      {isOwner && (
        <Link
          href="/biznis/fich"
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-bold text-stone-800 hover:bg-stone-50"
        >
          Modifye fich la
        </Link>
      )}
      <button
        type="button"
        onClick={() => void share()}
        aria-label="Pataje fich la"
        className="rounded-full border border-stone-300 p-2 text-stone-700 hover:bg-stone-50"
      >
        <ShareIcon className="h-5 w-5" />
      </button>
      {!isOwner && (
        <button
          type="button"
          onClick={() => setOpen((o) => (o === "closed" ? "menu" : "closed"))}
          aria-label="Plis aksyon"
          aria-haspopup="menu"
          aria-expanded={open !== "closed"}
          className="rounded-full border border-stone-300 p-2 text-stone-700 hover:bg-stone-50"
        >
          <MoreIcon className="h-5 w-5" />
        </button>
      )}
      {open !== "closed" && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-stone-200 bg-surface py-1 shadow-xl"
        >
          {open === "menu" ? (
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => requireAccount(() => setOpen("report"))}
            >
              Siyale fich sa a
            </button>
          ) : (
            <>
              <p className="px-4 pb-1 pt-2 text-sm font-bold text-stone-500">
                Poukisa w ap siyale l?
              </p>
              {ABUSE_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="menuitem"
                  className={`${item} font-medium`}
                  onClick={() => void report(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
