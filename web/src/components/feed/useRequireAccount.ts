"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

// Action réservée aux comptes avec pseudo : sinon, direction la connexion,
// avec retour sur la page actuelle.
export function useRequireAccount() {
  const { canPost, userId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (action: (userId: string) => void) => {
      if (canPost && userId) action(userId);
      else router.push(`/konekte?next=${encodeURIComponent(pathname)}`);
    },
    [canPost, userId, router, pathname],
  );
}
