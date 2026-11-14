"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { refreshProfiles } from "@/app/actions/profile";
import {
  authErrorMessage,
  useAuth,
  type MyProfile,
  type ProfileChanges,
} from "@/components/auth/AuthProvider";
import { inputClass } from "@/components/auth/PasswordInput";
import ImagePicker from "@/components/business/ImagePicker";
import { toast } from "@/components/Toaster";
import { BusinessError, businessErrorMessage } from "@/lib/business-actions";
import { removeProfileImages, uploadProfileImage } from "@/lib/profile-actions";
import { profileImageUrl } from "@/lib/storage";

const PSEUDO_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const NAME_MAX = 50;
const BIO_MAX = 160;

type Picked = { file: File; preview: string };

// Modifier son profil : couverture, photo, nom affiché, @tinon, bio, komin.
// Les photos ne partent qu'à l'enregistrement (comme l'app).
export default function ProfileForm({
  communes,
}: {
  communes: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const { ready, userId, profile } = useAuth();
  const signedIn = !!userId && !!profile?.pseudo;

  useEffect(() => {
    if (ready && !signedIn) router.replace("/konekte?next=%2Fpwofil");
  }, [ready, signedIn, router]);

  if (!ready || !profile?.pseudo) {
    return (
      <div className="mx-auto my-16 h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
    );
  }
  return <Form key={profile.id} profile={profile} communes={communes} />;
}

function Form({
  profile,
  communes,
}: {
  profile: MyProfile;
  communes: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const { userId, hasPassword, updateProfile } = useAuth();
  const [name, setName] = useState(profile.display_name ?? "");
  const [pseudo, setPseudo] = useState(profile.pseudo ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [commune, setCommune] = useState(profile.commune_slug ?? "");
  const [avatarPath, setAvatarPath] = useState(profile.avatar_path);
  const [coverPath, setCoverPath] = useState(profile.cover_path);
  const [avatar, setAvatar] = useState<Picked | null>(null);
  const [cover, setCover] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aperçus locaux libérés quand on change de photo ou quitte la page.
  useEffect(() => {
    if (avatar) return () => URL.revokeObjectURL(avatar.preview);
  }, [avatar]);
  useEffect(() => {
    if (cover) return () => URL.revokeObjectURL(cover.preview);
  }, [cover]);

  const pick = (file: File): Picked => ({
    file,
    preview: URL.createObjectURL(file),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !profile.pseudo) return;
    if (!PSEUDO_PATTERN.test(pseudo)) {
      setError("Tinon an dwe gen 3 a 20 karaktè: lèt, chif oswa _.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const changes: ProfileChanges = {
        display_name: name.trim() || null,
        bio: bio.trim() || null,
        commune_slug: commune || null,
        avatar_path: avatar
          ? await uploadProfileImage(userId, avatar.file, "avatar")
          : avatarPath,
        cover_path: cover
          ? await uploadProfileImage(userId, cover.file, "cover")
          : coverPath,
      };
      if (pseudo !== profile.pseudo) changes.pseudo = pseudo;
      await updateProfile(changes);
      // Anciennes photos remplacées ou retirées.
      await removeProfileImages(
        [profile.avatar_path, profile.cover_path].filter(
          (p): p is string =>
            !!p && p !== changes.avatar_path && p !== changes.cover_path,
        ),
      );
      await refreshProfiles([profile.pseudo, pseudo]);
      toast("Pwofil ou ajou.");
      router.push(`/u/${pseudo}`);
    } catch (err) {
      setError(
        err instanceof BusinessError
          ? businessErrorMessage(err)
          : (authErrorMessage(err) ?? null),
      );
      setBusy(false);
    }
  }

  const label =
    "mb-1.5 flex justify-between text-sm font-semibold text-stone-700";
  const counter = "font-normal text-stone-400";

  return (
    <form onSubmit={submit} className="space-y-5 px-4 py-5">
      <ImagePicker
        label="Foto kouvèti"
        path={coverPath}
        previewUrl={cover?.preview}
        urlFor={profileImageUrl}
        onPick={(f) => setCover(pick(f))}
        onRemove={() => {
          setCover(null);
          setCoverPath(null);
        }}
      />
      <ImagePicker
        label="Foto pwofil"
        shape="round"
        path={avatarPath}
        previewUrl={avatar?.preview}
        urlFor={profileImageUrl}
        onPick={(f) => setAvatar(pick(f))}
        onRemove={() => {
          setAvatar(null);
          setAvatarPath(null);
        }}
      />

      <label className="block">
        <span className={label}>
          Non ou
          <span className={counter}>
            {name.length}/{NAME_MAX}
          </span>
        </span>
        <input
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="Non moun ap wè a"
          autoComplete="name"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={label}>Tinon</span>
        <div className="flex items-center rounded-xl border border-stone-300 bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
          <span className="pl-4 text-stone-400">@</span>
          <input
            value={pseudo}
            onChange={(e) =>
              setPseudo(
                e.target.value.replace(/[^A-Za-z0-9_]/g, "").slice(0, 20),
              )
            }
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-transparent py-3 pl-1 pr-4 text-stone-900 outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-stone-500">
          3 a 20 karaktè: lèt, chif oswa _. Lyen pwofil ou ap chanje tou.
        </p>
      </label>

      <label className="block">
        <span className={label}>
          Bio
          <span className={counter}>
            {bio.length}/{BIO_MAX}
          </span>
        </span>
        <textarea
          value={bio}
          maxLength={BIO_MAX}
          rows={3}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Kèk mo sou ou"
          className={`${inputClass} resize-y`}
        />
      </label>

      <label className="block">
        <span className={label}>Komin</span>
        <select
          value={commune}
          onChange={(e) => setCommune(e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {communes.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-brand px-6 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "…" : "Anrejistre"}
        </button>
        <Link
          href={`/u/${profile.pseudo}`}
          className="rounded-full px-4 py-3 font-semibold text-stone-600 hover:bg-stone-100"
        >
          Anile
        </Link>
      </div>

      <div className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200">
        <Link
          href="/aktivite"
          className="flex items-center justify-between px-4 py-3.5 font-semibold text-stone-800 hover:bg-stone-50"
        >
          Aktivite mwen <span className="text-stone-400">›</span>
        </Link>
        {hasPassword && (
          <Link
            href="/pwofil/modpas"
            className="flex items-center justify-between px-4 py-3.5 font-semibold text-stone-800 hover:bg-stone-50"
          >
            Chanje modpas <span className="text-stone-400">›</span>
          </Link>
        )}
      </div>

      <div className="border-t border-stone-200 pt-6 text-center">
        <Link
          href="/pwofil/efase"
          className="text-sm font-semibold text-brand-red hover:underline"
        >
          Efase kont mwen
        </Link>
        <p className="mt-1 text-xs text-stone-500">
          Kont ou, piblikasyon ou yo ak foto ou yo ap efase nèt.{" "}
          <Link href="/konfidansyalite" className="underline">
            Plis enfòmasyon
          </Link>
        </p>
      </div>
    </form>
  );
}
