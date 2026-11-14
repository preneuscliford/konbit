import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Burnt from "burnt";
import { BadgeCheck, Heart, Pencil, Repeat2, Store } from "lucide-react-native";
import Colors from "@/constants/Colors";
import ActionSheet from "@/components/ui/ActionSheet";
import ShareIcon from "@/components/ui/ShareIcon";
import { Text } from "@/components/ui/Text";
import { useAccountGate } from "@/hooks/useAccountGate";
import { useAuth } from "@/lib/auth";
import { BUSINESS_SOCIAL_ENABLED, type FeedBusiness } from "@/lib/business";
import { useI18n } from "@/lib/i18n";
import {
  fetchBusinessSocialState,
  fetchMyBusinessState,
  KonbitError,
  mediaUrl,
  repostBusiness,
  setBusinessLike,
  undoBusinessRepost,
} from "@/lib/konbits";
import { shareBusiness } from "@/lib/share";

// Fiche business reprise dans le fil : en citation (sous une légende) ou en
// repost simple (avec J'aime, repost et partage de la fiche).

export type SocialBusiness = Pick<
  FeedBusiness,
  "id" | "slug" | "name" | "commune_slug" | "like_count" | "repost_count" | "liked" | "reposted"
>;

function BusinessSummary({ business: b, disabled = false }: { business: FeedBusiness; disabled?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/biznis/[slug]", params: { slug: b.slug } })}
      disabled={disabled}
      style={styles.box}
      android_ripple={{ color: Colors.ripple }}
      accessibilityRole="link"
    >
      {b.cover_path && <Image source={{ uri: mediaUrl(b.cover_path) }} style={styles.cover} contentFit="cover" />}
      <View style={styles.row}>
        {b.logo_path ? (
          <Image source={{ uri: mediaUrl(b.logo_path) }} style={styles.logo} contentFit="cover" />
        ) : (
          <View style={[styles.logo, styles.logoEmpty]}>
            <Store size={20} color={Colors.primary} />
          </View>
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {b.name}
            </Text>
            {b.verified && <BadgeCheck size={16} color={Colors.textInverse} fill={Colors.primary} />}
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {t("App.repost.businessBadge")} · {t(`App.business.categories.${b.category}`)}
          </Text>
          {b.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {b.description}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function Unavailable() {
  const { t } = useI18n();
  return (
    <View style={[styles.box, styles.missing]}>
      <Text style={styles.missingText}>{t("App.repost.businessUnavailable")}</Text>
    </View>
  );
}

// Sous une légende (« Site ») ou en aperçu dans l'écran de publication.
export function QuotedBusiness({ business, disabled }: { business: FeedBusiness | null | undefined; disabled?: boolean }) {
  if (!business) return <Unavailable />;
  return <BusinessSummary business={business} disabled={disabled} />;
}

// Repost simple d'une fiche : la fiche avec ses actions.
export default function BusinessFeedCard({ business }: { business: FeedBusiness | null | undefined }) {
  return (
    <View style={styles.card}>
      {business ? (
        <>
          <BusinessSummary business={business} />
          <BusinessSocialBar business={business} />
        </>
      ) : (
        <Unavailable />
      )}
    </View>
  );
}

// J'aime, repost (« Reposte » / « Site ») et partage d'une fiche : dans le fil
// et sur la page de la fiche.
// Désactivé pour l'instant (BUSINESS_SOCIAL_ENABLED) : rien ne s'affiche.
export function BusinessSocialBar({ business }: { business: SocialBusiness }) {
  if (!BUSINESS_SOCIAL_ENABLED) return null;
  return <BusinessSocialBarInner business={business} />;
}

function BusinessSocialBarInner({ business: initial }: { business: SocialBusiness }) {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const requireAccount = useAccountGate();
  const [b, setB] = useState(initial);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  // Nouvel état venu du parent (fil rechargé, état chargé après coup).
  const [source, setSource] = useState(initial);
  if (source !== initial) {
    setSource(initial);
    setB(initial);
  }

  const errorText = (e: unknown) => t(`App.konbitErrors.${e instanceof KonbitError ? e.code : "failed"}`);

  function toggleLike() {
    requireAccount(async () => {
      if (busy || !userId) return;
      setBusy(true);
      const on = !b.liked;
      setB((c) => ({ ...c, liked: on, like_count: Math.max(0, c.like_count + (on ? 1 : -1)) }));
      try {
        await setBusinessLike(b.id, userId, on);
      } catch (e) {
        setB((c) => ({ ...c, liked: !on, like_count: Math.max(0, c.like_count + (on ? -1 : 1)) }));
        Burnt.toast({ title: errorText(e), preset: "error" });
      } finally {
        setBusy(false);
      }
    });
  }

  async function toggleRepost() {
    if (!userId) return;
    const on = !b.reposted;
    setB((c) => ({ ...c, reposted: on, repost_count: Math.max(0, c.repost_count + (on ? 1 : -1)) }));
    try {
      if (on) await repostBusiness(b);
      else await undoBusinessRepost(b.id, userId);
      Burnt.toast({ title: t(on ? "App.repost.businessDone" : "App.repost.undone"), preset: "done" });
      void queryClient.invalidateQueries({ queryKey: ["konbits"] });
    } catch (e) {
      setB((c) => ({ ...c, reposted: !on, repost_count: Math.max(0, c.repost_count + (on ? -1 : 1)) }));
      Burnt.toast({ title: errorText(e), preset: "error" });
    }
  }

  return (
    <View style={styles.actions}>
      <Pressable
        onPress={toggleLike}
        style={styles.action}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("App.repost.like")}
        accessibilityState={{ selected: b.liked }}
      >
        <Heart
          size={18}
          color={b.liked ? Colors.secondary : Colors.textMuted}
          fill={b.liked ? Colors.secondary : "transparent"}
        />
        <Text style={[styles.actionText, b.liked && { color: Colors.secondary }]}>{b.like_count}</Text>
      </Pressable>

      <Pressable
        onPress={() => requireAccount(() => setSheet(true))}
        style={styles.action}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("App.repost.action")}
        accessibilityState={{ selected: b.reposted }}
      >
        <Repeat2 size={19} color={b.reposted ? Colors.success : Colors.textMuted} />
        {b.repost_count > 0 && (
          <Text style={[styles.actionText, b.reposted && { color: Colors.success }]}>{b.repost_count}</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => shareBusiness(b.name, b.slug, t)}
        style={styles.action}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("App.share.action")}
      >
        <ShareIcon size={19} color={Colors.textMuted} />
      </Pressable>

      <ActionSheet
        visible={sheet}
        options={[
          {
            label: t(b.reposted ? "App.repost.undo" : "App.repost.action"),
            destructive: b.reposted,
            icon: <Repeat2 size={21} color={b.reposted ? Colors.secondary : Colors.text} />,
            onPress: () => void toggleRepost(),
          },
          {
            label: t("App.repost.quote"),
            icon: <Pencil size={20} color={Colors.text} />,
            onPress: () => router.push({ pathname: "/compose", params: { businessId: String(b.id) } }),
          },
        ]}
        onClose={() => setSheet(false)}
      />
    </View>
  );
}

// Annuaire : état de l'utilisateur pour toute la liste (une requête).
export function useBusinessListState(ids: number[]) {
  const { userId } = useAuth();
  const query = useQuery({
    queryKey: ["businessSocial", "list", ids.join(","), userId],
    queryFn: () => fetchMyBusinessState(userId!, ids),
    enabled: BUSINESS_SOCIAL_ENABLED && !!userId && ids.length > 0,
  });
  return useMemo(
    () => ({
      liked: new Set(userId ? (query.data?.liked ?? []) : []),
      reposted: new Set(userId ? (query.data?.reposted ?? []) : []),
    }),
    [query.data, userId],
  );
}

// Ligne de l'annuaire : la barre avec l'état venu de la liste.
export function BusinessRowSocial({
  business,
  liked,
  reposted,
}: {
  business: Omit<SocialBusiness, "liked" | "reposted">;
  liked: boolean;
  reposted: boolean;
}) {
  const value = useMemo(() => ({ ...business, liked, reposted }), [business, liked, reposted]);
  return <BusinessSocialBar business={value} />;
}

// Page d'une fiche : la barre, avec l'état de l'utilisateur chargé à part.
export function BusinessPageSocial({ business }: { business: Omit<SocialBusiness, "liked" | "reposted"> }) {
  const { userId } = useAuth();
  const state = useQuery({
    queryKey: ["businessSocial", business.id, userId],
    queryFn: () => fetchBusinessSocialState(business.id, userId!),
    enabled: BUSINESS_SOCIAL_ENABLED && !!userId,
  });
  const liked = !!userId && !!state.data?.liked;
  const reposted = !!userId && !!state.data?.reposted;
  // Objet stable : la barre se recale seulement quand l'état change vraiment.
  const value = useMemo(() => ({ ...business, liked, reposted }), [business, liked, reposted]);
  return <BusinessSocialBar business={value} />;
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingBottom: 10, paddingLeft: 66 },
  box: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: 14,
    overflow: "hidden",
  },
  cover: { width: "100%", aspectRatio: 3 },
  row: { flexDirection: "row", gap: 10, padding: 12, alignItems: "center" },
  logo: { width: 44, height: 44, borderRadius: 10 },
  logoEmpty: { backgroundColor: Colors.primary50, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: "700", color: Colors.text },
  meta: { fontSize: 13, color: Colors.textMuted },
  description: { fontSize: 14, color: Colors.textLight, lineHeight: 19 },
  missing: { padding: 12, backgroundColor: Colors.surfaceMuted },
  missingText: { fontSize: 14, color: Colors.textMuted },
  actions: { flexDirection: "row", alignItems: "center", gap: 28, paddingTop: 8 },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, color: Colors.textMuted },
});
