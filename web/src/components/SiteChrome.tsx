import Image from "next/image";
import Link from "next/link";
import AccountMenu from "@/components/auth/AccountMenu";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { LEGAL, PLAY_STORE_URL } from "@/lib/site";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt=""
        width={36}
        height={34}
        priority
        className="h-[34px] w-9 object-contain"
      />
      <span className="text-lg font-extrabold tracking-tight text-brand">
        Konbit 509
      </span>
    </Link>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-semibold text-stone-600 md:flex">
          <Link href="/konbit" className="hover:text-brand">
            Konbit yo
          </Link>
          <Link href="/#sa-w-ka-fe" className="hover:text-brand">
            Sa w ka fè
          </Link>
          <Link href="/#kijan" className="hover:text-brand">
            Kijan li mache
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle className="p-2" />
          <span className="hidden sm:inline-flex">
            <AppButton small />
          </span>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

export function AppButton({
  small = false,
  light = false,
}: {
  small?: boolean;
  light?: boolean;
}) {
  return (
    <a
      href={PLAY_STORE_URL}
      className={`inline-flex items-center gap-2 rounded-full font-bold transition hover:-translate-y-0.5 ${
        light
          ? "bg-white text-brand shadow-lg shadow-black/10"
          : "bg-brand text-white shadow-md shadow-brand/20"
      } ${small ? "px-4 py-2 text-sm" : "px-6 py-3.5"}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={small ? "h-4 w-4" : "h-5 w-5"}
        fill="currentColor"
      >
        <path d="M3.6 2.3 13.4 12l-9.8 9.7c-.4-.2-.6-.6-.6-1.1V3.4c0-.5.2-.9.6-1.1Zm11 11 2.4 2.4-11.2 6.4 8.8-8.8Zm3.6-3.7 3 1.7c.8.5.8 1.5 0 2l-3 1.7-2.7-2.7 2.7-2.7ZM5.8 1.9 17 8.3l-2.4 2.4-8.8-8.8Z" />
      </svg>
      {small ? "Telechaje" : "Telechaje sou Google Play"}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.5fr_1fr_1fr] sm:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-stone-500">
            Aplikasyon kominote gratis pou Ayiti ak dyaspora a : pataje lide,
            pwojè ak diskisyon, epi aji ansanm.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-bold text-stone-900">Konbit 509</p>
          <ul className="mt-3 space-y-2 text-stone-500">
            <li>
              <Link href="/konbit" className="hover:text-brand">
                Tout konbit yo
              </Link>
            </li>
            <li>
              <a
                href="mailto:konbit@haitiscope.com"
                className="hover:text-brand"
              >
                Kontakte nou
              </a>
            </li>
            <li>
              <a href="https://haitiscope.com" className="hover:text-brand">
                HaitiScope
              </a>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-bold text-stone-900">Legal</p>
          <ul className="mt-3 space-y-2 text-stone-500">
            <li>
              <a href={LEGAL.terms} className="hover:text-brand">
                Kondisyon itilizasyon
              </a>
            </li>
            <li>
              <a href={LEGAL.privacy} className="hover:text-brand">
                Konfidansyalite
              </a>
            </li>
            <li>
              <a href={LEGAL.childSafety} className="hover:text-brand">
                Sekirite timoun
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-stone-100 py-4 text-center text-xs text-stone-400">
        © 2026 Konbit 509 · yon pwojè HaitiScope
      </p>
    </footer>
  );
}
