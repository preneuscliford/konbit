import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Burnt from "burnt";
import { Camera, X } from "lucide-react-native";
import Colors from "@/constants/Colors";
import CommunePicker from "@/components/konbit/CommunePicker";
import Avatar from "@/components/konbit509/Avatar";
import { Text, TextInput } from "@/components/ui/Text";
import { useCommunes } from "@/hooks/useKonbit";
import { AuthError, useAuth, type ProfileChanges } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { compressImage, type CompressedImage } from "@/lib/imageCompression";
import { profileImageUrl, uploadProfileImage } from "@/lib/konbits";

const PSEUDO_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const NAME_MAX = 50;
const BIO_MAX = 160;
// Photo de profil petite, couverture plus large : toutes deux bien sous 1 Mo.
const AVATAR_SIDE = 400;
const COVER_SIDE = 1500;

// Modifier son profil : couverture, photo, nom affiché, @pseudo, bio, commune.
export default function ProfileEditScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { userId, profile, updateProfile, deleteAccount } = useAuth();
  const communes = useCommunes();

  const [name, setName] = useState(profile?.display_name ?? "");
  const [pseudo, setPseudo] = useState(profile?.pseudo ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [communeSlug, setCommuneSlug] = useState(profile?.commune_slug ?? "");
  const [avatar, setAvatar] = useState<CompressedImage | null>(null);
  const [cover, setCover] = useState<CompressedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId || !profile?.pseudo) return <Redirect href="/account" />;

  async function pick(kind: "avatar" | "cover") {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: kind === "avatar" ? [1, 1] : [3, 1],
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      const compressed = await compressImage(
        asset.uri,
        asset.width,
        asset.height,
        kind === "avatar" ? AVATAR_SIDE : COVER_SIDE,
      );
      if (kind === "avatar") setAvatar(compressed);
      else setCover(compressed);
    } catch {
      setError(t("App.compose.imageError"));
    }
  }

  async function save() {
    if (!PSEUDO_PATTERN.test(pseudo)) {
      setError(t("App.account.pseudoInvalid"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const changes: ProfileChanges = {
        display_name: name.trim() || null,
        bio: bio.trim() || null,
        commune_slug: communeSlug || null,
      };
      if (pseudo !== profile?.pseudo) changes.pseudo = pseudo;
      if (avatar) changes.avatar_path = await uploadProfileImage(userId!, "avatar", avatar);
      if (cover) changes.cover_path = await uploadProfileImage(userId!, "cover", cover);
      await updateProfile(changes);
      Burnt.toast({ title: t("App.userProfile.saved"), preset: "done" });
      router.back();
    } catch (e) {
      const code = e instanceof AuthError ? e.code : "failed";
      setError(
        code === "pseudo_taken"
          ? t("App.account.pseudoTaken")
          : code === "pseudo_invalid"
            ? t("App.account.pseudoInvalid")
            : t("App.konbitErrors.failed"),
      );
      setBusy(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(t("App.profile.deleteAccount"), t("App.profile.deleteConfirm"), [
      { text: t("App.cancel"), style: "cancel" },
      {
        text: t("App.profile.deleteAccount"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAccount();
            Burnt.toast({ title: t("App.profile.deleted"), preset: "done" });
            router.dismissAll();
          } catch {
            Burnt.toast({ title: t("App.konbitErrors.failed"), preset: "error" });
          }
        },
      },
    ]);
  }

  const coverUri = cover?.uri ?? (profile.cover_path ? profileImageUrl(profile.cover_path) : null);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <X size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("App.userProfile.edit")}</Text>
        <Pressable
          onPress={save}
          disabled={busy}
          style={[styles.save, busy && { opacity: 0.6 }]}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
        >
          {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveText}>{t("App.account.save")}</Text>}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
          <Pressable onPress={() => pick("cover")} style={styles.cover} accessibilityLabel={t("App.userProfile.changeCover")}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <LinearGradient colors={["#00209F", "#2541C4", "#D21034"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            )}
            <View style={styles.cameraBadge}>
              <Camera size={18} color="#FFFFFF" />
            </View>
          </Pressable>

          <Pressable onPress={() => pick("avatar")} style={styles.avatarWrap} accessibilityLabel={t("App.userProfile.changeAvatar")}>
            {avatar ? (
              <Image source={{ uri: avatar.uri }} style={styles.avatarPreview} contentFit="cover" />
            ) : (
              <Avatar
                pseudo={profile.pseudo}
                name={profile.display_name}
                avatarPath={profile.avatar_path}
                seed={userId}
                size={86}
                ring
              />
            )}
            <View style={styles.avatarCamera}>
              <Camera size={16} color="#FFFFFF" />
            </View>
          </Pressable>

          <View style={styles.form}>
            <Field label={t("App.userProfile.name")} counter={`${name.length}/${NAME_MAX}`}>
              <TextInput
                value={name}
                onChangeText={(v) => setName(v.slice(0, NAME_MAX))}
                placeholder={t("App.userProfile.namePlaceholder")}
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
            </Field>

            <Field label={t("App.userProfile.username")}>
              <View style={styles.pseudoField}>
                <Text style={styles.at}>@</Text>
                <TextInput
                  value={pseudo}
                  onChangeText={(v) => setPseudo(v.replace(/[^A-Za-z0-9_]/g, "").slice(0, 20))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, styles.pseudoInput]}
                />
              </View>
              <Text style={styles.hint}>{t("App.account.pseudoHint")}</Text>
            </Field>

            <Field label={t("App.userProfile.bio")} counter={`${bio.length}/${BIO_MAX}`}>
              <TextInput
                value={bio}
                onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
                placeholder={t("App.userProfile.bioPlaceholder")}
                placeholderTextColor={Colors.textMuted}
                multiline
                style={[styles.input, styles.bioInput]}
              />
            </Field>

            <Field label={t("App.account.commune")}>
              <CommunePicker
                communes={communes.data ?? []}
                value={communeSlug}
                onChange={setCommuneSlug}
                placeholder={t("Konbit.communePlaceholder")}
              />
            </Field>

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable onPress={confirmDeleteAccount} style={styles.deleteAccount} hitSlop={8}>
              <Text style={styles.deleteAccountText}>{t("App.profile.deleteAccount")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, counter, children }: { label: string; counter?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.label}>{label}</Text>
        {counter ? <Text style={styles.counter}>{counter}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  title: { flex: 1, fontSize: 18, fontWeight: "800", color: Colors.text },
  save: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
    minWidth: 90,
    alignItems: "center",
    overflow: "hidden",
  },
  saveText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  cover: { height: 140, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cameraBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: { marginTop: -43, marginLeft: 16, alignSelf: "flex-start" },
  avatarPreview: { width: 86, height: 86, borderRadius: 43, borderWidth: 4, borderColor: "#FFFFFF" },
  avatarCamera: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  form: { padding: 16, gap: 16 },
  field: { gap: 6 },
  fieldHeader: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 14, fontWeight: "700", color: Colors.text },
  counter: { fontSize: 12, color: Colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  pseudoField: { flexDirection: "row", alignItems: "center", gap: 6 },
  at: { fontSize: 18, fontWeight: "600", color: Colors.textMuted },
  pseudoInput: { flex: 1 },
  bioInput: { minHeight: 84, textAlignVertical: "top" },
  hint: { fontSize: 12, color: Colors.textMuted },
  error: { fontSize: 14, color: Colors.error },
  deleteAccount: { alignSelf: "center", paddingTop: 24 },
  deleteAccountText: { fontSize: 14, color: Colors.secondary, fontWeight: "600" },
});
