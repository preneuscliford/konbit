"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { refreshFeed } from "@/app/actions/konbit";
import { useAuth } from "@/components/auth/AuthProvider";
import { inputClass } from "@/components/auth/PasswordInput";
import { HandshakeIcon, ImageIcon, PinIcon } from "@/components/Icons";
import EmojiButton, { useEmojiInsert } from "@/components/EmojiButton";
import QuotedKonbit from "@/components/feed/QuotedKonbit";
import { toast } from "@/components/Toaster";
import {
  businessErrorMessage,
  removeFiles,
  uploadPhoto,
} from "@/lib/business-actions";
import type { Konbit, KonbitImage } from "@/lib/data";
import {
  createKonbit,
  fetchKonbitById,
  konbitErrorMessage,
  quoteRepost,
  repost,
} from "@/lib/konbit-actions";
import { formatKonbitRange, haitiToDate, haitiToday } from "@/lib/konbit-time";
import { mediaUrl } from "@/lib/storage";

// pos : simple publication (« Pòs ») ; konbit : action collective.
type Mode = "konbit" | "pos";
type Duration = "day" | "week" | "month" | "custom";

const DURATIONS: { value: Duration; label: string; days: number }[] = [
  { value: "day", label: "1 jou", days: 0 },
  { value: "week", label: "1 semèn", days: 6 },
  { value: "month", label: "1 mwa", days: 29 },
  { value: "custom", label: "Lòt dat", days: 0 },
];

const STEPS = ["Kisa", "Ki kote", "Kilè", "Ki moun"] as const;
// Brouillon d'un message transformé en konbit (icône 🤝).
const DRAFT_KEY = "konbit-compose-draft";

type Draft = { body: string; images: KonbitImage[]; commune: string };

// Lu une seule fois à l'ouverture du konbit, puis effacé.
function takeDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    sessionStorage.removeItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
const MAX_IMAGES = 2;

// Date du champ (AAAA-MM-JJ) décalée de n jours.
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Publier : un simple message (/lanse, par défaut) ou un konbit en 4 étapes
// (/lanse/konbit). Les deux pages sont séparées, avec un sélecteur en haut.
export default function ComposeFlow({
  communes,
  mode,
}: {
  communes: { slug: string; name: string }[];
  mode: Mode;
}) {
  const router = useRouter();
  const { ready, userId, canPost, profile } = useAuth();
  const [step, setStep] = useState(0);

  // Champs communs
  // Konbit ouvert depuis un message : on reprend ce qui était écrit.
  const [draft] = useState(() => (mode === "konbit" ? takeDraft() : null));
  const [body, setBody] = useState(draft?.body ?? "");
  const [commune, setCommune] = useState(draft?.commune ?? "");
  const [images, setImages] = useState<KonbitImage[]>(draft?.images ?? []);
  const [uploading, setUploading] = useState(false);
  // Konbit
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState(() => haitiToday(1));
  const [startTime, setStartTime] = useState("08:00");
  const [duration, setDuration] = useState<Duration>("day");
  const [endDate, setEndDate] = useState(() => haitiToday(2));
  const [limited, setLimited] = useState(false);
  const [max, setMax] = useState("20");

  const [busy, setBusy] = useState(false);
  // « Site » (citer) : /lanse?site=<id>, la publication d'origine en dessous ;
  // la légende est facultative.
  const siteParam = useSearchParams().get("site");
  const quoteId =
    mode === "pos" && siteParam && /^\d+$/.test(siteParam)
      ? Number(siteParam)
      : null;
  const [original, setOriginal] = useState<Konbit | null>(null);
  // Emoji : insérés à la position du curseur de chaque champ libre.
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const insertInBody = useEmojiInsert(
    bodyRef,
    body,
    setBody,
    mode === "konbit" ? 1000 : 280,
  );
  const insertInTitle = useEmojiInsert(titleRef, title, setTitle, 80);
  useEffect(() => {
    if (!quoteId) return;
    let cancelled = false;
    fetchKonbitById(quoteId)
      .then((k) => !cancelled && setOriginal(k))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [quoteId]);
  const quoting = quoteId !== null;
  const [pickCommune, setPickCommune] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !canPost)
      router.replace(
        `/konekte?next=${encodeURIComponent(mode === "konbit" ? "/lanse/konbit" : "/lanse")}`,
      );
  }, [ready, canPost, router, mode]);

  // Commune du profil par défaut.
  const [communeSet, setCommuneSet] = useState(false);
  // Konbit : la commune du profil par défaut. Message : aucune (facultatif).
  if (
    !communeSet &&
    mode === "konbit" &&
    !draft?.commune &&
    profile?.commune_slug
  ) {
    setCommuneSet(true);
    setCommune(profile.commune_slug);
  }

  const startsAt = haitiToDate(startDate, startTime);
  const lastDay =
    duration === "custom"
      ? endDate
      : addDays(startDate, DURATIONS.find((d) => d.value === duration)!.days);
  const endsAt = haitiToDate(lastDay, "23:59");
  const maxNumber = Number(max);

  function checkStep(s: number): string | null {
    if (s === 0) {
      if (title.trim().length < 3)
        return "Bay konbit la yon non (omwen 3 karaktè).";
      if (!body.trim()) return "Eksplike an kout sa konbit la ye.";
    }
    if (s === 1 && !commune) return "Chwazi komin kote konbit la ap fèt.";
    if (s === 2) {
      if (startDate < haitiToday()) return "Dat kòmansman an pase deja.";
      if (endsAt.getTime() <= startsAt.getTime())
        return "Dat fen an dwe apre dat kòmansman an.";
      if (endsAt.getTime() - startsAt.getTime() > 365 * 86_400_000)
        return "Yon konbit pa ka dire plis pase yon ane.";
    }
    if (
      s === 3 &&
      limited &&
      (!Number.isInteger(maxNumber) || maxNumber < 2 || maxNumber > 10000)
    ) {
      return "Kantite moun maksimòm nan dwe ant 2 ak 10 000.";
    }
    return null;
  }

  function next() {
    const problem = checkStep(step);
    if (problem) return setError(problem);
    setError(null);
    setStep((s) => s + 1);
  }

  async function addImage(file: File) {
    if (!userId) return;
    setUploading(true);
    setError(null);
    try {
      const photo = await uploadPhoto(userId, file, "konbit");
      setImages((list) => [...list, photo]);
    } catch (e) {
      setError(businessErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  function removeImage(path: string) {
    setImages((list) => list.filter((i) => i.path !== path));
    void removeFiles([path]);
  }

  async function publish() {
    const problem =
      mode === "konbit" ? [0, 1, 2, 3].map(checkStep).find(Boolean) : null;
    if (problem) return setError(problem);
    if (mode === "pos" && !quoting) {
      if (!body.trim()) return setError("Ekri pòs ou anvan.");
    }
    setBusy(true);
    setError(null);
    try {
      // Citer : sans légende ni photo, c'est un repost simple.
      if (quoting) {
        if (!original) throw new Error("not_found");
        if (!body.trim() && images.length === 0) {
          await repost(original);
          await refreshFeed();
          toast("Ou reposte l.");
          router.push(`/k/${original.id}`);
        } else {
          const id = await quoteRepost(
            body,
            commune || original.commune_slug,
            images,
            original.id,
          );
          await refreshFeed();
          toast("Ou site l.");
          router.push(`/k/${id}`);
        }
        return;
      }
      const id = await createKonbit(
        mode === "konbit"
          ? {
              kind: "konbit",
              title: title.trim(),
              body: body.trim(),
              commune_slug: commune,
              address_detail: address.trim() || null,
              starts_at: startsAt.toISOString(),
              ends_at: endsAt.toISOString(),
              max_participants: limited ? maxNumber : null,
              media: images,
            }
          : {
              kind: "discussion",
              body: body.trim(),
              // Sans commune : tout le pays (« national »), comme dans l'app.
              commune_slug: commune || "national",
              media: images,
            },
      );
      await refreshFeed();
      toast(mode === "konbit" ? "Konbit ou lanse! 🙌" : "Pòs ou pibliye.");
      router.push(`/k/${id}`);
    } catch (e) {
      setError(konbitErrorMessage(e));
      setBusy(false);
    }
  }

  if (!ready || !canPost) {
    return (
      <div className="mx-auto my-16 h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
    );
  }

  const label = "mb-1.5 block text-sm font-semibold text-stone-700";
  const communeName = communes.find((c) => c.slug === commune)?.name ?? "";
  const chip = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-bold ${
      active
        ? "border-brand bg-brand text-white"
        : "border-stone-300 text-stone-700 hover:bg-stone-50"
    }`;

  // Message → konbit : on garde ce qui est déjà écrit (texte, photos,
  // commune) et on passe aux 4 étapes.
  function toKonbit() {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ body, images, commune }),
      );
    } catch {
      // Stockage bloqué : on passe au konbit sans le brouillon.
    }
    router.push("/lanse/konbit");
  }

  const photos = (
    <div>
      <span className={label}>Foto (pa obligatwa, {MAX_IMAGES} maksimòm)</span>
      <div className="flex flex-wrap gap-3">
        {images.map((img) => (
          <div
            key={img.path}
            className="relative h-24 w-24 overflow-hidden rounded-2xl border border-stone-200"
          >
            <Image
              src={mediaUrl(img.path)}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(img.path)}
              aria-label="Retire foto a"
              className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-white"
            >
              ×
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <label
            className={`flex h-24 w-24 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 text-sm font-semibold text-stone-500 hover:border-brand hover:text-brand ${
              uploading ? "animate-pulse" : ""
            }`}
          >
            {uploading ? "…" : "+ Foto"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void addImage(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );

  const communeSelect = (
    <label className="block">
      <span className={label}>Komin *</span>
      <select
        value={commune}
        onChange={(e) => setCommune(e.target.value)}
        className={inputClass}
      >
        <option value="">—</option>
        {communes
          .filter((c) => c.slug !== "national")
          .map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
      </select>
    </label>
  );

  const feedback = error && (
    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {error}
    </p>
  );

  // ─── Message simple ────────────────────────────────────────────────────────
  if (mode === "pos") {
    return (
      <>
        {/* Comme X : le texte d'abord ; photo et lieu en petites icônes. */}
        <div className="px-4 py-4">
          <textarea
            ref={bodyRef}
            value={body}
            maxLength={280}
            rows={5}
            autoFocus
            aria-label="Pòs ou"
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              quoting
                ? "Ajoute yon mesaj (pa obligatwa)…"
                : "Sak pase, sak ap fèt?"
            }
            className="w-full resize-none bg-transparent text-xl leading-relaxed text-stone-900 outline-none placeholder:text-stone-400"
          />

          {images.length > 0 && (
            <div
              className={`mt-2 grid gap-2 ${images.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {images.map((img) => (
                <div
                  key={img.path}
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-stone-200"
                >
                  <Image
                    src={mediaUrl(img.path)}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 90vw, 520px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(img.path)}
                    aria-label="Retire foto a"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-lg text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {commune && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-1 text-sm font-semibold text-brand">
              <PinIcon className="h-4 w-4" />
              {communeName}
              <button
                type="button"
                onClick={() => setCommune("")}
                aria-label="Retire komin nan"
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-brand/10"
              >
                ×
              </button>
            </span>
          )}

          {pickCommune && (
            <select
              value={commune}
              autoFocus
              aria-label="Komin"
              onChange={(e) => {
                setCommune(e.target.value);
                setPickCommune(false);
              }}
              onBlur={() => setPickCommune(false)}
              className={`${inputClass} mt-3`}
            >
              <option value="">Chwazi yon komin…</option>
              {communes
                .filter((c) => c.slug !== "national")
                .map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
            </select>
          )}

          {feedback && <div className="mt-3">{feedback}</div>}

          {quoting && original && <QuotedKonbit original={original} disabled />}

          <div className="mt-3 flex items-center gap-1 border-t border-stone-200 pt-3">
            <label
              title={
                images.length >= MAX_IMAGES
                  ? `${MAX_IMAGES} foto maksimòm`
                  : "Ajoute yon foto"
              }
              className={`flex h-10 w-10 items-center justify-center rounded-full text-brand hover:bg-blue-50 ${
                images.length >= MAX_IMAGES || uploading
                  ? "pointer-events-none opacity-40"
                  : "cursor-pointer"
              } ${uploading ? "animate-pulse" : ""}`}
            >
              <ImageIcon className="h-[22px] w-[22px]" />
              <span className="sr-only">Ajoute yon foto</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={images.length >= MAX_IMAGES || uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void addImage(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => setPickCommune((v) => !v)}
              title="Ajoute yon komin (pa obligatwa)"
              aria-label="Ajoute yon komin"
              aria-pressed={pickCommune || !!commune}
              className={`flex h-10 w-10 items-center justify-center rounded-full hover:bg-blue-50 ${
                commune ? "text-brand" : "text-brand/80"
              }`}
            >
              <PinIcon className="h-[22px] w-[22px]" />
            </button>
            <EmojiButton onPick={insertInBody} />
            {!quoting && (
              <button
                type="button"
                onClick={toKonbit}
                title="Fè l tounen yon konbit (yon aksyon ansanm, ak dat ak moun)"
                aria-label="Fè l tounen yon konbit"
                className="flex h-10 w-10 items-center justify-center rounded-full text-brand/80 hover:bg-blue-50 hover:text-brand"
              >
                <HandshakeIcon className="h-[22px] w-[22px]" />
              </button>
            )}
            <span
              className={`ml-auto text-sm ${body.length > 260 ? "text-brand-red" : "text-stone-400"}`}
            >
              {body.length > 0 && `${body.length}/280`}
            </span>
            <button
              type="button"
              onClick={() => void publish()}
              disabled={
                busy || uploading || (quoting ? !original : !body.trim())
              }
              className="ml-3 rounded-full bg-brand px-5 py-2.5 font-bold text-white hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "…" : quoting ? "Site" : "Pibliye"}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Konbit en 4 étapes ────────────────────────────────────────────────────
  return (
    <>
      <p className="px-4 pt-3 text-right text-sm">
        <Link
          href="/lanse"
          className="font-semibold text-stone-500 hover:text-brand hover:underline"
        >
          Se yon pòs senp pito?
        </Link>
      </p>
      <div className="px-4 py-3">
        <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Etap yo">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined}>
              <span
                className={`block h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-stone-200"}`}
              />
              <span
                className={`mt-1.5 block text-xs font-bold ${i === step ? "text-brand" : "text-stone-400"}`}
              >
                {i + 1}. {s}
              </span>
            </li>
          ))}
        </ol>

        <div className="space-y-5">
          {step === 0 && (
            <>
              <h2 className="text-xl font-extrabold text-stone-900">
                Ki konbit w ap lanse?
              </h2>
              <label className="block">
                <span className={`${label} flex items-center justify-between`}>
                  Non konbit la *
                  <EmojiButton onPick={insertInTitle} placement="down" />
                </span>
                <input
                  ref={titleRef}
                  value={title}
                  maxLength={80}
                  autoFocus
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Egz: Netwayaj nan Delmas 33"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={`${label} flex items-center justify-between`}>
                  Eksplikasyon *
                  <EmojiButton onPick={insertInBody} placement="down" />
                </span>
                <textarea
                  ref={bodyRef}
                  value={body}
                  maxLength={1000}
                  rows={5}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Kisa nou pral fè, poukisa, sa moun dwe pote…"
                  className={`${inputClass} resize-y`}
                />
                <span className="mt-1 block text-right text-xs text-stone-400">
                  {body.length}/1000
                </span>
              </label>
              {photos}
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-xl font-extrabold text-stone-900">
                Ki kote l ap fèt?
              </h2>
              {communeSelect}
              <label className="block">
                <span className={label}>Plis presizyon sou adrès la</span>
                <input
                  value={address}
                  maxLength={120}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Egz: Devan lekòl nasyonal la"
                  className={inputClass}
                />
                <span className="mt-1 block text-xs text-stone-500">
                  Pa obligatwa. Pa mete adrès lakay moun.
                </span>
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-extrabold text-stone-900">
                Kilè l ap fèt?
              </h2>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <label className="block">
                  <span className={label}>Dat li kòmanse *</span>
                  <input
                    type="date"
                    value={startDate}
                    min={haitiToday()}
                    max={haitiToday(365)}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate < e.target.value)
                        setEndDate(addDays(e.target.value, 1));
                    }}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={label}>Lè</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
              <div>
                <span className={label}>Konbyen tan l ap dire? *</span>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDuration(d.value)}
                      className={chip(duration === d.value)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              {duration === "custom" && (
                <label className="block">
                  <span className={label}>Dènye jou a *</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={addDays(startDate, 365)}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
              <p className="rounded-2xl bg-stone-50 px-4 py-3 text-[15px] text-stone-800">
                🗓{" "}
                {formatKonbitRange(
                  startsAt.toISOString(),
                  endsAt.toISOString(),
                )}
                <span className="block text-xs text-stone-500">Lè Ayiti</span>
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-extrabold text-stone-900">
                Konbyen moun?
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLimited(false)}
                  className={chip(!limited)}
                >
                  Pa gen limit
                </button>
                <button
                  type="button"
                  onClick={() => setLimited(true)}
                  className={chip(limited)}
                >
                  Mete yon limit
                </button>
              </div>
              {limited && (
                <label className="block">
                  <span className={label}>
                    Kantite moun maksimòm (ou menm ladan)
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={2}
                    max={10000}
                    value={max}
                    onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
                    className={`${inputClass} max-w-40`}
                  />
                </label>
              )}

              <div className="rounded-3xl border border-stone-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Apèsi
                </p>
                <p className="mt-1 text-lg font-extrabold text-stone-900">
                  {title}
                </p>
                <p className="mt-1 text-sm text-stone-700">
                  🗓{" "}
                  {formatKonbitRange(
                    startsAt.toISOString(),
                    endsAt.toISOString(),
                  )}
                </p>
                <p className="text-sm text-stone-700">
                  📍 {communeName}
                  {address.trim() && ` · ${address.trim()}`}
                </p>
                <p className="text-sm text-stone-700">
                  👥{" "}
                  {limited
                    ? `${maxNumber || "?"} moun maksimòm`
                    : "Tout moun ki vle"}
                </p>
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-stone-600">
                  {body}
                </p>
              </div>
            </>
          )}

          {feedback}

          <div className="flex justify-between gap-3 pt-1">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep((s) => s - 1);
                }}
                className="rounded-full px-4 py-3 font-semibold text-stone-600 hover:bg-stone-100"
              >
                ← Retounen
              </button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                disabled={uploading}
                className="rounded-full bg-brand px-6 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                Kontinye →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void publish()}
                disabled={busy}
                className="rounded-full bg-brand px-6 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "…" : "Lanse konbit la 🤝"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
