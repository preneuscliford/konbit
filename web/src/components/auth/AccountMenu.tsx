"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { MoreIcon } from "@/components/Icons";
import { useAuth } from "./AuthProvider";

// Compte : « Konekte », ou l'avatar avec son menu. `up` : en bas de la barre
// latérale (le menu s'ouvre vers le haut, nom affiché sur grand écran).
export default function AccountMenu({
  placement = "down",
}: {
  placement?: "down" | "up";
}) {
  const { ready, userId, profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!ready)
    return (
      <span
        className="block h-9 w-9 animate-pulse rounded-full bg-stone-200"
        aria-hidden
      />
    );

  if (!userId || !profile?.pseudo) {
    if (pathname === "/konekte") return null;
    return (
      <Link
        href={`/konekte?next=${encodeURIComponent(pathname)}`}
        className={
          placement === "up"
            ? // Bas de la barre latérale : bouton plein, bien visible.
              "hidden rounded-full border-2 border-brand px-4 py-2.5 text-center text-[15px] font-bold text-brand hover:bg-blue-50 xl:block"
            : "rounded-full border border-stone-300 px-4 py-2 text-sm font-bold text-stone-800 hover:border-brand hover:text-brand"
        }
      >
        {userId ? "Fini kont ou" : "Konekte"}
      </Link>
    );
  }

  const name = profile.display_name || profile.pseudo;
  const item =
    "block w-full px-4 py-2.5 text-left text-[15px] font-semibold text-stone-800 hover:bg-stone-50";
  const up = placement === "up";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Kont mwen"
        className={`flex items-center gap-3 rounded-full text-left transition ${
          up
            ? "p-2 hover:bg-stone-100 xl:w-full xl:pr-3"
            : "ring-brand/30 hover:ring-4"
        }`}
      >
        <Avatar
          name={name}
          avatarPath={profile.avatar_path}
          seed={profile.id}
          size={up ? 40 : 34}
        />
        {up && (
          <>
            <span className="hidden min-w-0 flex-1 xl:block">
              <span className="block truncate text-[15px] font-bold text-stone-900">
                {name}
              </span>
              <span className="block truncate text-sm text-stone-500">
                @{profile.pseudo}
              </span>
            </span>
            <MoreIcon className="hidden h-[18px] w-[18px] text-stone-500 xl:block" />
          </>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-40 w-64 overflow-hidden rounded-2xl border border-stone-200 bg-surface py-1 shadow-xl ${
            up ? "bottom-full left-0 mb-2" : "right-0 mt-2"
          }`}
        >
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="truncate font-bold text-stone-900">{name}</p>
            <p className="truncate text-sm text-stone-500">@{profile.pseudo}</p>
          </div>
          <Link
            href={`/u/${profile.pseudo}`}
            className={item}
            onClick={() => setOpen(false)}
          >
            Pwofil mwen
          </Link>
          <Link href="/pwofil" className={item} onClick={() => setOpen(false)}>
            Modifye pwofil
          </Link>
          <Link
            href="/aktivite"
            className={item}
            onClick={() => setOpen(false)}
          >
            Aktivite mwen
          </Link>
          <button
            type="button"
            className={`${item} text-brand-red`}
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.refresh();
            }}
          >
            Dekonekte @{profile.pseudo}
          </button>
        </div>
      )}
    </div>
  );
}
