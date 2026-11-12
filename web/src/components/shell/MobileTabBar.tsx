"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { PlusIcon } from "@/components/Icons";
import { COMPOSE_HREF, isActive, NAV, navHref } from "./nav";

// Onglets en bas de l'écran sur téléphone (comme l'app), avec le bouton
// « Lanse » au centre.
export default function MobileTabBar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const pseudo = profile?.pseudo;
  // Deux onglets de chaque côté du bouton « + ».
  const left = NAV.slice(0, 2);
  const right = NAV.slice(2);

  const tab = (item: (typeof NAV)[number]) => {
    const active = isActive(item.key, pathname, pseudo);
    return (
      <Link
        key={item.key}
        href={navHref(item.key, pseudo)}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={`flex flex-1 justify-center py-2.5 ${active ? "text-brand" : "text-stone-700"}`}
      >
        {/* Icônes seules ; l'onglet actif a une pastille colorée. */}
        <span
          className={`rounded-full px-5 py-1.5 ${active ? "bg-blue-50" : ""}`}
        >
          <item.Icon
            className="h-[26px] w-[26px]"
            strokeWidth={active ? 2.6 : 2.1}
          />
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-stone-300 bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:hidden">
      {left.map(tab)}
      <div className="flex flex-1 justify-center">
        <Link
          href={COMPOSE_HREF}
          aria-label="Pibliye"
          className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/40 ring-4 ring-surface"
        >
          <PlusIcon className="h-7 w-7" strokeWidth={2.4} />
        </Link>
      </div>
      {right.map(tab)}
    </nav>
  );
}
