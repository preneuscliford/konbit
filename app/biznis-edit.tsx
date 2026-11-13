import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import * as Burnt from "burnt";
import { ImagePlus, Store, X } from "lucide-react-native";
import Colors from "@/constants/Colors";
import CommunePicker from "@/components/konbit/CommunePicker";
import KeyboardScroll from "@/components/ui/KeyboardScroll";
import { Text, TextInput } from "@/components/ui/Text";
import { useMyBusiness } from "@/hooks/useBusiness";
import { useCommunes } from "@/hooks/useKonbit";
import { useAuth } from "@/lib/auth";
import {
  BUSINESS_CATEGORIES,
  BusinessError,
  deleteBusiness,
  PHONE_PATTERN,
  removeFiles,
  saveBusiness,
  SLUG_PATTERN,
  slugify,
  type Business,
  type BusinessCategory,
} from "@/lib/business";
import { compressImage } from "@/lib/imageCompression";
import { useI18n } from "@/lib/i18n";
import { mediaUrl, uploadKonbitImage } from "@/lib/konbits";

// Créer ou modifier sa fiche business (une par membre), comme sur le site.
export default function BusinessEditScreen() {
  const { userId, canPost } = useAuth();
  const mine = useMyBusiness();

  if (!canPost) return <Redirect href="/account" />;
  if (mine.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }
  // Le formulaire démarre avec la fiche existante (ou vide) une fois chargée.
  return <BusinessForm key={mine.data?.id ?? "new"} existing={mine.data ?? null} userId={userId!} />;
}

function BusinessForm({ existing, userId }: { existing: Business | null; userId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const communes = useCommunes();

  const [name, setName] = useState(existing?.name ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!existing);
  const [category, setCategory] = useState<BusinessCategory | "">(existing?.category ?? "");
  const [commune, setCommune] = useState(existing?.commune_slug ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [whatsapp, setWhatsapp] = useState(existing?.whatsapp ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [website, setWebsite] = useState(existing?.website ?? "");
  const [hours, setHours] = useState(existing?.hours ?? "");
  const [logo, setLogo] = useState(existing?.logo_path ?? null);
  const [cover, setCover] = useState(existing?.cover_path ?? null);
  // Photos remplacées : supprimées une fois la fiche enregistrée.
  const [replaced, setReplaced] = useState<string[]>([]);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorText = (e: unknown) => t(`App.business.errors.${e instanceof BusinessError ? e.code : "failed"}`);
  const orNull = (v: string) => (v.trim() ? v.trim() : null);

  async function pick(kind: "logo" | "cover") {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(kind);
    setError(null);
    try {
      const photo = await uploadKonbitImage(userId, await compressImage(asset.uri, asset.width, asset.height));
      const previous = kind === "logo" ? logo : cover;
      if (previous) setReplaced((r) => [...r, previous]);
      if (kind === "logo") setLogo(photo.path);
      else setCover(photo.path);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setUploading(null);
    }
  }

  function validate(): string | null {
    if (name.trim().length < 2) return t("App.business.form.errors.name");
    if (!SLUG_PATTERN.test(slug)) return t("App.business.form.errors.slug");
    if (!category) return t("App.business.form.errors.category");
    if (!commune) return t("App.business.form.errors.commune");
    if ((phone && !PHONE_PATTERN.test(phone.trim())) || (whatsapp && !PHONE_PATTERN.test(whatsapp.trim()))) {
      return t("App.business.form.errors.phone");
    }
    if (!phone.trim() && !whatsapp.trim()) return t("App.business.form.errors.contact");
    if (website.trim() && !/^https?:\/\/\S+$/.test(website.trim())) return t("App.business.form.errors.website");
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      const saved = await saveBusiness(
        {
          name: name.trim(),
          slug,
          category: category as BusinessCategory,
          commune_slug: commune,
          address: orNull(address),
          description: orNull(description),
          phone: orNull(phone),
          whatsapp: orNull(whatsapp),
          email: orNull(email),
          website: orNull(website),
          hours: orNull(hours),
          logo_path: logo,
          cover_path: cover,
        },
        existing?.id,
      );
      await removeFiles(replaced);
      await queryClient.invalidateQueries({ queryKey: ["business"] });
      Burnt.toast({ title: t("App.business.form.saved"), preset: "done" });
      router.replace({ pathname: "/biznis/[slug]", params: { slug: saved.slug } });
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  function remove() {
    if (!existing) return;
    Alert.alert(t("App.business.form.deleteConfirm"), undefined, [
      { text: t("App.collectif.no"), style: "cancel" },
      {
        text: t("App.business.form.delete"),
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await deleteBusiness(existing);
            await queryClient.invalidateQueries({ queryKey: ["business"] });
            Burnt.toast({ title: t("App.business.form.deleted"), preset: "done" });
            router.dismissTo("/biznis");
          } catch (e) {
            setError(errorText(e));
            setBusy(false);
          }
        },
      },
    ]);
  }

  const field = (label: string, input: React.ReactNode, hint?: string) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {input}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <X size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>{existing ? t("App.business.form.editTitle") : t("App.business.form.createTitle")}</Text>
      </View>

      <KeyboardScroll contentContainerStyle={styles.content}>
        {field(
          t("App.business.form.cover"),
          <Pressable onPress={() => pick("cover")} style={styles.coverPick} disabled={!!uploading}>
            {cover ? (
              <Image source={{ uri: mediaUrl(cover) }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : uploading === "cover" ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <ImagePlus size={26} color={Colors.primary} />
            )}
          </Pressable>,
        )}
        {field(
          t("App.business.form.logo"),
          <Pressable onPress={() => pick("logo")} style={styles.logoPick} disabled={!!uploading}>
            {logo ? (
              <Image source={{ uri: mediaUrl(logo) }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : uploading === "logo" ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Store size={30} color={Colors.primary} />
            )}
          </Pressable>,
        )}

        {field(
          `${t("App.business.form.name")} *`,
          <TextInput
            value={name}
            maxLength={60}
            onChangeText={(v) => {
              setName(v);
              if (!slugEdited) setSlug(slugify(v));
            }}
            placeholder={t("App.business.form.namePlaceholder")}
            style={styles.input}
          />,
        )}
        {field(
          `${t("App.business.form.slug")} *`,
          <TextInput
            value={slug}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(v) => {
              setSlugEdited(true);
              setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50));
            }}
            style={styles.input}
          />,
          t("App.business.form.slugHint"),
        )}

        {field(
          `${t("App.business.form.category")} *`,
          <View style={styles.chips}>
            {BUSINESS_CATEGORIES.map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                  {t(`App.business.categories.${c}`)}
                </Text>
              </Pressable>
            ))}
          </View>,
        )}
        {field(
          `${t("App.business.form.commune")} *`,
          <CommunePicker
            communes={(communes.data ?? []).filter((c) => c.slug !== "national")}
            value={commune}
            onChange={setCommune}
            placeholder={t("App.business.form.commune")}
          />,
        )}
        {field(
          t("App.business.form.address"),
          <TextInput
            value={address}
            maxLength={120}
            onChangeText={setAddress}
            placeholder={t("App.business.form.addressPlaceholder")}
            style={styles.input}
          />,
        )}
        {field(
          t("App.business.form.description"),
          <TextInput
            value={description}
            maxLength={500}
            onChangeText={setDescription}
            placeholder={t("App.business.form.descriptionPlaceholder")}
            multiline
            style={[styles.input, styles.textarea]}
          />,
        )}
        {field(
          t("App.business.form.whatsapp"),
          <TextInput value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" placeholder="+509 3XXX XXXX" style={styles.input} />,
        )}
        {field(
          t("App.business.form.phone"),
          <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+509 3XXX XXXX" style={styles.input} />,
          t("App.business.form.phoneHint"),
        )}
        {field(
          t("App.business.form.email"),
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={120}
            style={styles.input}
          />,
        )}
        {field(
          t("App.business.form.website"),
          <TextInput
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://"
            maxLength={200}
            style={styles.input}
          />,
        )}
        {field(
          t("App.business.form.hours"),
          <TextInput
            value={hours}
            onChangeText={setHours}
            maxLength={200}
            placeholder={t("App.business.form.hoursPlaceholder")}
            style={styles.input}
          />,
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={save}
          disabled={busy || !!uploading}
          style={[styles.primary, (busy || !!uploading) && styles.disabled]}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
          accessibilityRole="button"
        >
          {busy && <ActivityIndicator size="small" color={Colors.textInverse} />}
          <Text style={styles.primaryText}>{existing ? t("App.business.form.save") : t("App.business.form.create")}</Text>
        </Pressable>
        {existing && (
          <Pressable onPress={remove} disabled={busy} style={styles.delete}>
            <Text style={styles.deleteText}>{t("App.business.form.delete")}</Text>
          </Pressable>
        )}
      </KeyboardScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  topBar: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, paddingVertical: 12 },
  topTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "700", color: Colors.textLight },
  hint: { fontSize: 12, color: Colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  textarea: { minHeight: 110, textAlignVertical: "top" },
  coverPick: {
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoPick: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: Colors.textLight },
  chipTextActive: { color: Colors.textInverse },
  error: { color: Colors.error, fontSize: 14 },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    overflow: "hidden",
  },
  disabled: { opacity: 0.45 },
  primaryText: { color: Colors.textInverse, fontWeight: "800", fontSize: 16 },
  delete: { alignSelf: "center", padding: 10 },
  deleteText: { color: Colors.secondary, fontWeight: "700" },
});
