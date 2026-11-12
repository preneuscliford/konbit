"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { refreshBusiness } from "@/app/actions/business";
import { useAuth } from "@/components/auth/AuthProvider";
import { inputClass } from "@/components/auth/PasswordInput";
import { toast } from "@/components/Toaster";
import {
  BUSINESS_CATEGORIES,
  isCategory,
  PHONE_PATTERN,
  SLUG_PATTERN,
  slugify,
  type Business,
  type BusinessCategory,
} from "@/lib/business";
import {
  businessErrorMessage,
  deleteBusiness,
  fetchMyBusiness,
  fetchMyItems,
  removeFiles,
  saveBusiness,
  uploadPhoto,
} from "@/lib/business-actions";
import ImagePicker from "./ImagePicker";

type Form = {
  name: string;
  slug: string;
  category: BusinessCategory | "";
  commune_slug: string;
  address: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  hours: string;
  logo_path: string | null;
  cover_path: string | null;
};

const EMPTY: Form = {
  name: "",
  slug: "",
  category: "",
  commune_slug: "",
  address: "",
  description: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  hours: "",
  logo_path: null,
  cover_path: null,
};

const fromBusiness = (b: Business): Form => ({
  name: b.name,
  slug: b.slug,
  category: b.category,
  commune_slug: b.commune_slug,
  address: b.address ?? "",
  description: b.description ?? "",
  phone: b.phone ?? "",
  whatsapp: b.whatsapp ?? "",
  email: b.email ?? "",
  website: b.website ?? "",
  hours: b.hours ?? "",
  logo_path: b.logo_path,
  cover_path: b.cover_path,
});

const orNull = (v: string) => (v.trim() ? v.trim() : null);

// Créer ou modifier sa fiche business (une par membre pour l'instant).
export default function BusinessForm({
  communes,
}: {
  communes: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const { ready, userId, canPost } = useAuth();
  const [existing, setExisting] = useState<Business | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [slugEdited, setSlugEdited] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fichiers à supprimer une fois la fiche enregistrée (photos remplacées).
  const [replaced, setReplaced] = useState<string[]>([]);

  useEffect(() => {
    if (!ready) return;
    if (!canPost || !userId) {
      router.replace("/konekte?next=%2Fbiznis%2Ffich");
      return;
    }
    let cancelled = false;
    fetchMyBusiness(userId)
      .then((b) => {
        if (cancelled) return;
        setExisting(b);
        if (b) {
          setForm(fromBusiness(b));
          setSlugEdited(true);
        }
      })
      .catch((e) => !cancelled && setError(businessErrorMessage(e)))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [ready, canPost, userId, router]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function pickImage(kind: "logo" | "cover", file: File) {
    if (!userId) return;
    setUploading(kind);
    setError(null);
    try {
      const photo = await uploadPhoto(userId, file, kind);
      const key = kind === "logo" ? "logo_path" : "cover_path";
      const previous = form[key];
      if (previous) setReplaced((r) => [...r, previous]);
      set(key, photo.path);
    } catch (e) {
      setError(businessErrorMessage(e));
    } finally {
      setUploading(null);
    }
  }

  function validate(): string | null {
    if (form.name.trim().length < 2)
      return "Mete non biznis la (omwen 2 karaktè).";
    if (!SLUG_PATTERN.test(form.slug))
      return "Adrès la dwe gen 3 a 50 karaktè: lèt miniskil, chif oswa -.";
    if (!isCategory(form.category)) return "Chwazi yon kategori.";
    if (!form.commune_slug) return "Chwazi komin biznis la.";
    if (form.phone && !PHONE_PATTERN.test(form.phone.trim()))
      return "Nimewo telefòn nan pa bon.";
    if (form.whatsapp && !PHONE_PATTERN.test(form.whatsapp.trim()))
      return "Nimewo WhatsApp la pa bon.";
    if (!form.phone.trim() && !form.whatsapp.trim())
      return "Mete omwen yon nimewo (telefòn oswa WhatsApp) pou moun ka kontakte w.";
    if (form.website && !/^https?:\/\/\S+$/.test(form.website.trim()))
      return "Sit wèb la dwe kòmanse ak https://";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      const saved = await saveBusiness(
        {
          name: form.name.trim(),
          slug: form.slug,
          category: form.category as BusinessCategory,
          commune_slug: form.commune_slug,
          address: orNull(form.address),
          description: orNull(form.description),
          phone: orNull(form.phone),
          whatsapp: orNull(form.whatsapp),
          email: orNull(form.email),
          website: orNull(form.website),
          hours: orNull(form.hours),
          logo_path: form.logo_path,
          cover_path: form.cover_path,
        },
        existing?.id,
      );
      if (replaced.length) await removeFiles(replaced);
      await refreshBusiness([saved.slug, existing?.slug ?? saved.slug]);
      toast(existing ? "Fich la ajou." : "Fich biznis ou kreye!");
      router.push(`/b/${saved.slug}`);
    } catch (err) {
      setError(businessErrorMessage(err));
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    if (
      !window.confirm(
        "Efase fich biznis ou ak tout katalòg li? Ou p ap ka jwenn yo ankò.",
      )
    )
      return;
    setBusy(true);
    try {
      const items = await fetchMyItems(existing.id);
      await deleteBusiness(existing, items);
      await refreshBusiness([existing.slug]);
      toast("Fich la efase.");
      router.push("/biznis");
    } catch (err) {
      setError(businessErrorMessage(err));
      setBusy(false);
    }
  }

  if (!ready || !loaded) {
    return (
      <div className="mx-auto my-16 h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
    );
  }

  const label = "mb-1.5 block text-sm font-semibold text-stone-700";
  const hint = "mt-1 text-xs text-stone-500";

  return (
    <form onSubmit={submit} className="space-y-5 px-4 py-5">
      <ImagePicker
        label="Foto kouvèti"
        path={form.cover_path}
        busy={uploading === "cover"}
        onPick={(f) => void pickImage("cover", f)}
        onRemove={() => {
          if (form.cover_path) setReplaced((r) => [...r, form.cover_path!]);
          set("cover_path", null);
        }}
      />
      <ImagePicker
        label="Logo"
        shape="round"
        path={form.logo_path}
        busy={uploading === "logo"}
        onPick={(f) => void pickImage("logo", f)}
        onRemove={() => {
          if (form.logo_path) setReplaced((r) => [...r, form.logo_path!]);
          set("logo_path", null);
        }}
      />

      <label className="block">
        <span className={label}>Non biznis la *</span>
        <input
          value={form.name}
          maxLength={60}
          onChange={(e) => {
            const name = e.target.value;
            setForm((f) => ({
              ...f,
              name,
              slug: slugEdited ? f.slug : slugify(name),
            }));
          }}
          placeholder="Egz: Kafe Lakay"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={label}>Adrès fich la *</span>
        <div className="flex items-center rounded-xl border border-stone-300 bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
          <span className="pl-4 text-stone-400">/b/</span>
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugEdited(true);
              set(
                "slug",
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "")
                  .slice(0, 50),
              );
            }}
            className="w-full bg-transparent py-3 pr-4 text-stone-900 outline-none"
          />
        </div>
        <p className={hint}>
          Se lyen fich ou: lèt miniskil, chif ak tirè sèlman.
        </p>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Kategori *</span>
          <select
            value={form.category}
            onChange={(e) =>
              set("category", e.target.value as BusinessCategory)
            }
            className={inputClass}
          >
            <option value="">—</option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Komin *</span>
          <select
            value={form.commune_slug}
            onChange={(e) => set("commune_slug", e.target.value)}
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
      </div>

      <label className="block">
        <span className={label}>Adrès</span>
        <input
          value={form.address}
          maxLength={120}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Egz: 12, Ri Lamè, Okap"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={label}>Deskripsyon</span>
        <textarea
          value={form.description}
          maxLength={500}
          rows={4}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Sa w fè, sa ki fè biznis ou espesyal…"
          className={`${inputClass} resize-y`}
        />
        <p className={hint}>{form.description.length}/500</p>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={label}>WhatsApp</span>
          <input
            value={form.whatsapp}
            inputMode="tel"
            onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="+509 3XXX XXXX"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={label}>Telefòn</span>
          <input
            value={form.phone}
            inputMode="tel"
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+509 3XXX XXXX"
            className={inputClass}
          />
        </label>
      </div>
      <p className="-mt-3 text-xs text-stone-500">
        Omwen youn nan de nimewo yo. Yo parèt sou fich la pou moun kontakte w.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Imèl</span>
          <input
            type="email"
            value={form.email}
            maxLength={120}
            onChange={(e) => set("email", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={label}>Sit wèb</span>
          <input
            value={form.website}
            maxLength={200}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className={label}>Lè ou louvri</span>
        <input
          value={form.hours}
          maxLength={200}
          onChange={(e) => set("hours", e.target.value)}
          placeholder="Egz: Lendi–Samdi, 8è–6è"
          className={inputClass}
        />
      </label>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={busy || !!uploading}
          className="rounded-full bg-brand px-6 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "…" : existing ? "Anrejistre chanjman yo" : "Kreye fich la"}
        </button>
        {existing && (
          <Link
            href={`/b/${existing.slug}`}
            className="rounded-full px-4 py-3 font-semibold text-stone-600 hover:bg-stone-100"
          >
            Anile
          </Link>
        )}
        {existing && (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className="ml-auto text-sm font-semibold text-brand-red hover:underline"
          >
            Efase fich la
          </button>
        )}
      </div>
    </form>
  );
}
