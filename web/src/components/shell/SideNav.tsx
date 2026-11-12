"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/components/auth/AccountMenu";
import { useAuth } from "@/components/auth/AuthProvider";
import { PenIcon } from "@/components/Icons";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { COMPOSE_HREF, isActive, NAV, navHref } from "./nav";

// Barre latÃ©rale gauche (tablette et ordinateur), inspirÃ©e de X : icÃ´nes
// seules sur tablette, icÃ´nes + libellÃ©s sur grand Ã©cran.
export default function SideNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const pseudo = profile?.pseudo;

  return (
    <header className="sticky top-0 hidden h-dvh shrink-0 flex-col justify-between py-3 sm:flex sm:w-[76px] sm:items-center xl:w-[260px] xl:items-stretch xl:pr-6">
      <div className="flex flex-col gap-1 sm:items-center xl:items-stretch">
        <Link
          href="/"
          aria-label="Konbit 509"
          className="mb-2 flex w-fit items-center gap-2.5 rounded-full p-2.5 hover:bg-stone-100"
        >
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={30}
            className="h-[30px] w-8 object-contain"
          />
          <span className="hidden text-lg font-extrabold tracking-tight text-brand xl:inline">
            Konbit 509
          </span>
        </Link>

        <nav className="flex flex-col gap-1 sm:items-center xl:items-stretch">
          {NAV.map(({ key, label, Icon }) => {
            const active = isActive(key, pathname, pseudo);
            return (
              <Link
                key={key}
                href={navHref(key, pseudo)}
                aria-current={active ? "page" : undefined}
                title={label}
                className="group flex w-fit items-center gap-4 rounded-full p-3 text-xl text-stone-900 hover:bg-stone-100 xl:pr-6"
              >
                <Icon
                  className="h-[26px] w-[26px]"
                  strokeWidth={active ? 2.6 : 1.9}
                />
                <span
                  className={`hidden xl:inline ${active ? "font-extrabold" : "font-medium"}`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <Link
          href={COMPOSE_HREF}
          className="mt-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-brand font-bold text-white shadow-md shadow-brand/25 transition hover:opacity-90 xl:h-auto xl:w-full xl:py-3.5 xl:text-[17px]"
          aria-label="Lanse yon konbit"
        >
          <PenIcon className="h-6 w-6 xl:hidden" />
          <span className="hidden xl:inline">Lanse yon konbit</span>
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:items-center xl:items-stretch xl:pl-2">
        <ThemeToggle withLabel placement="up" className="w-fit p-3 xl:pr-6" />
        <AccountMenu placement="up" />
      </div>
    </header>
  );
}
