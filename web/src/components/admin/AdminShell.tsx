"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchPendingCount } from "@/lib/admin";

const TABS = [
  { href: "/admin", label: "Tablo" },
  { href: "/admin/siyalman", label: "Siyalman" },
  { href: "/admin/itilizate", label: "Itilizatè" },
  { href: "/admin/anons", label: "Anons", adminOnly: true },
];

// Cadre de l'administration : réservé à l'équipe (moderator / admin). La base
// revérifie le rôle à chaque action ; ici on évite seulement d'afficher des
// écrans inutiles aux autres.
export default function AdminShell({
  adminOnly = false,
  children,
}: {
  adminOnly?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, userId, isModerator, isAdmin } = useAuth();
  const [pending, setPending] = useState(0);
  const allowed = adminOnly ? isAdmin : isModerator;

  useEffect(() => {
    if (ready && !userId)
      router.replace(`/konekte?next=${encodeURIComponent(pathname)}`);
  }, [ready, userId, pathname, router]);

  useEffect(() => {
    if (!isModerator) return;
    let cancelled = false;
    fetchPendingCount()
      .then((n) => !cancelled && setPending(n))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isModerator, pathname]);

  if (!ready || !userId) {
    return (
      <div className="mx-auto my-16 h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
    );
  }

  if (!allowed) {
    return (
      <p className="mx-auto max-w-sm px-6 py-16 text-center text-stone-500">
        Paj sa a se pou ekip moderasyon Konbit 509 la sèlman.
      </p>
    );
  }

  return (
    <>
      <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 px-2 [scrollbar-width:none]">
        {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => {
          const active =
            t.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 border-b-4 px-3 py-3 text-[15px] ${
                active
                  ? "border-brand font-bold text-stone-900"
                  : "border-transparent font-medium text-stone-500 hover:text-stone-800"
              }`}
            >
              {t.label}
              {t.href === "/admin/siyalman" && pending > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 text-xs font-bold leading-5 text-white">
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {children}
    </>
  );
}

export const Spinner = () => (
  <div className="mx-auto my-12 h-7 w-7 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-stone-500">
    {children}
  </h2>
);
