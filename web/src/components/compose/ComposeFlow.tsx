"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { refreshFeed } from "@/app/actions/konbit";
import { useAuth } from "@/components/auth/AuthProvider";
import { inputClass } from "@/components/auth/PasswordInput";
import { toast } from "@/components/Toaster";
import {
  businessErrorMessage,
  removeFiles,
  uploadPhoto,
} from "@/lib/business-actions";
import type { KonbitImage } from "@/lib/data";
import { createKonbit, konbitErrorMessage } from "@/lib/konbit-actions";
import { formatKonbitRange, haitiToDate, haitiToday } from "@/lib/konbit-time";
import { mediaUrl } from "@/lib/storage";

type Mode = "konbit" | "mesaj";
type Duration = "day" | "week" | "month" | "custom";

const DURATIONS: { value: Duration; label: string; days: number }[] = [
  { value: "day", label: "1 jou", days: 0 },
  { value: "week", label: "1 semèn", days: 6 },
  { value: "month", label: "1 mwa", days: 29 },
  { value: "custom", label: "Lòt dat", days: 0 },
];

const STEPS = ["Kisa", "Ki kote", "Kilè", "Ki moun"] as const;
const MAX_IMAGES = 2;

// Date du champ (AAAA-MM-JJ) décalée de n jours.
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Lancer un konbit (4 étapes) ou partager un simple message.
export default function ComposeFlow({
  communes,
}: {
  communes: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { ready, userId, canPost, profile } = useAuth();
  const [mode, setMode] = useState<Mode | null>(() => {
    const t = params.get("tip");
    return t === "konbit" || t === "mesaj" ? t : null;
  });
  const [step, setStep] = useState(0);

  // Champs communs
  const [body, setBody] = useState("");
  const [commune, setCommune] = useState("");
  const [images, setImages] = useState<KonbitImage[]>([]);
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !canPost) router.replace("/konekte?next=%2Flanse");
  }, [ready, canPost, router]);

  // Commune du profil par défaut.
  const [communeSet, setCommuneSet] = useState(false);
  if (!communeSet && profile?.commune_slug) {
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
    if (mode === "mesaj") {
      if (!body.trim()) return setError("Ekri mesaj ou anvan.");
      if (!commune) return setError("Chwazi yon komin.");
    }
    setBusy(true);
    setError(null);
    try {
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
              commune_slug: commune,
              media: images,
            },
      );
      await refreshFeed();
      toast(mode === "konbit" ? "Konbit ou lanse! 🙌" : "Mesaj ou pibliye.");
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

  // ─── Choix du type ─────────────────────────────────────────────────────────
  if (!mode) {
    return (
      <div className="space-y-3 px-4 py-6">
        <p className="text-stone-600">Kisa w vle pataje ak kominote a?</p>
        <button
          type="button"
          onClick={() => setMode("konbit")}
          className="block w-full rounded-3xl border-2 border-brand bg-blue-50 p-5 text-left hover:opacity-90"
        >
          <span className="text-2xl" aria-hidden>
            🤝
          </span>
          <span className="mt-2 block text-xl font-extrabold text-brand">
            Lanse yon konbit
          </span>
          <span className="mt-1 block text-[15px] text-stone-700">
            Yon aksyon ansanm, nan yon kote, pandan yon tan : netwaye yon ri,
            ede peyizan nan yon jaden, monte yon pwojè… Moun yo ka rejwenn ou.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode("mesaj")}
          className="block w-full rounded-3xl border border-stone-300 p-5 text-left hover:bg-stone-50"
        >
          <span className="text-2xl" aria-hidden>
            💬
          </span>
          <span className="mt-2 block text-xl font-extrabold text-stone-900">
            Pataje yon mesaj
          </span>
          <span className="mt-1 block text-[15px] text-stone-600">
            Yon kesyon, yon nouvèl, yon lide pou diskite. Tout moun ka reponn.
          </span>
        </button>
      </div>
    );
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
        {communes.map((c) => (
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
  if (mode === "mesaj") {
    return (
      <div className="space-y-5 px-4 py-5">
        <label className="block">
          <span className={label}>Mesaj ou *</span>
          <textarea
            value={body}
            maxLength={280}
            rows={5}
            autoFocus
            onChange={(e) => setBody(e.target.value)}
            placeholder="Sak pase, sak ap fèt?"
            className={`${inputClass} resize-y`}
          />
          <span className="mt-1 block text-right text-xs text-stone-400">
            {body.length}/280
          </span>
        </label>
        {communeSelect}
        {photos}
        {feedback}
        <div className="flex justify-between gap-3">
          <button
            type="button"
            onClick={() => setMode(null)}
            className="rounded-full px-4 py-3 font-semibold text-stone-600 hover:bg-stone-100"
          >
            ← Retounen
          </button>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={busy || uploading}
            className="rounded-full bg-brand px-6 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : "Pibliye"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Konbit en 4 étapes ────────────────────────────────────────────────────
  return (
    <div className="px-4 py-5">
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
              <span className={label}>Non konbit la *</span>
              <input
                value={title}
                maxLength={80}
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Egz: Netwaye ravin Delmas 33"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={label}>Eksplikasyon *</span>
              <textarea
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
              {formatKonbitRange(startsAt.toISOString(), endsAt.toISOString())}
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
          <button
            type="button"
            onClick={() => {
              setError(null);
              if (step === 0) setMode(null);
              else setStep((s) => s - 1);
            }}
            className="rounded-full px-4 py-3 font-semibold text-stone-600 hover:bg-stone-100"
          >
            ← Retounen
          </button>
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
  );
}
