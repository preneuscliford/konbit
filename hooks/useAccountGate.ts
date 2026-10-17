import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useCommunes } from "@/hooks/useKonbit";

// Lire ne demande rien. Agir (publier, répondre, Mwen ladan, signaler) demande
// un compte avec pseudo : sinon on ouvre l'écran de connexion.
export function useAccountGate() {
  const { canPost } = useAuth();
  const router = useRouter();
  return useCallback(
    (action: () => void) => {
      if (canPost) action();
      else router.push("/account");
    },
    [canPost, router],
  );
}

// Les communes viennent du catalogue HaïtiScope (même slug partout).
export function useCommuneName() {
  const communes = useCommunes();
  const names = useMemo(
    () => new Map((communes.data ?? []).map((c) => [c.slug, c.name] as const)),
    [communes.data],
  );
  return useCallback((slug: string) => names.get(slug) ?? slug, [names]);
}
