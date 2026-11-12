"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccountMenu from "@/components/auth/AccountMenu";
import { BackIcon } from "@/components/Icons";
import ThemeToggle from "@/components/theme/ThemeToggle";

// En-tête collant de la colonne centrale (titre de la page, retour). Sur
// téléphone, il porte aussi le logo et le compte, comme l'app.
export default function PageHeader({
  title,
  subtitle,
  back = false,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-20 border-b border-stone-200 bg-surface/85 backdrop-blur-md">
      <div className="flex min-h-[53px] items-center gap-3 px-4">
        {back ? (
          <button
            type="button"
            onClick={() =>
              window.history.length > 1 ? router.back() : router.push("/konbit")
            }
            aria-label="Retounen"
            className="-ml-2 rounded-full p-2 hover:bg-stone-100"
          >
            <BackIcon className="h-5 w-5" />
          </button>
        ) : (
          <Link href="/" aria-label="Konbit 509" className="sm:hidden">
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={26}
              className="h-[26px] w-7 object-contain"
            />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold leading-tight text-stone-900">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-[13px] text-stone-500">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle className="p-2" />
          <AccountMenu />
        </div>
      </div>
      {children}
    </div>
  );
}
