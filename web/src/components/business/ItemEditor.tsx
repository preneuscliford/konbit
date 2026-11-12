"use client";

import { useEffect, useState } from "react";
import { inputClass } from "@/components/auth/PasswordInput";
import type { BusinessItem, ItemPhoto } from "@/lib/business";
import {
  businessErrorMessage,
  removeFiles,
  saveItem,
  uploadPhoto,
} from "@/lib/business-actions";
import ImagePicker from "./ImagePicker";

const MAX_PHOTOS = 3;

// Fenêtre pour ajouter ou modifier un article du katalòg.
export default function ItemEditor({
  businessId,
  userId,
  item,
  onSaved,
  onClose,
}: {
  businessId: number;
  userId: string;
  item: BusinessItem | null;
  onSaved: (item: BusinessItem) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<BusinessItem["kind"]>(
    item?.kind ?? "product",
  );
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(
    item?.price != null ? String(item.price) : "",
  );
  const [currency, setCurrency] = useState<BusinessItem["currency"]>(
    item?.currency ?? "HTG",
  );
  const [available, setAvailable] = useState(item?.available ?? true);
  const [photos, setPhotos] = useState<ItemPhoto[]>(item?.photos ?? []);
  // Photos envoyées pendant cette édition (à supprimer si on annule).
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const escape = (e: KeyboardEvent) => e.key === "Escape" && cancel();
    document.addEventListener("keydown", escape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = "";
    };
  });

  function cancel() {
    if (uploaded.length) void removeFiles(uploaded);
    onClose();
  }

  async function addPhoto(file: File) {
    setUploading(true);
    setError(null);
    try {
      const photo = await uploadPhoto(userId, file, "item");
      setPhotos((p) => [...p, photo]);
      setUploaded((u) => [...u, photo.path]);
    } catch (e) {
      setError(businessErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(path: string) {
    setPhotos((p) => p.filter((x) => x.path !== path));
    if (uploaded.includes(path)) {
      setUploaded((u) => u.filter((x) => x !== path));
      void removeFiles([path]);
    } else {
      setRemoved((r) => [...r, path]);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2)
      return setError("Mete non atik la (omwen 2 karaktè).");
    const amount = price.trim() === "" ? null : Number(price.replace(",", "."));
    if (amount !== null && (!Number.isFinite(amount) || amount < 0))
      return setError("Pri a pa bon.");
    setBusy(true);
    setError(null);
    try {
      const saved = await saveItem(
        businessId,
        {
          kind,
          name: name.trim(),
          description: description.trim() || null,
          price: amount,
          currency,
          photos,
          available,
        },
        item?.id,
      );
      if (removed.length) await removeFiles(removed);
      onSaved(saved);
    } catch (err) {
      setError(businessErrorMessage(err));
      setBusy(false);
    }
  }

  const label = "mb-1.5 block text-sm font-semibold text-stone-700";
  const segment = (active: boolean) =>
    `flex-1 rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-brand text-white" : "text-stone-600 hover:bg-stone-100"}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={cancel}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={item ? "Modifye atik la" : "Nouvo atik"}
        className="max-h-[92dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-stone-900">
            {item ? "Modifye atik la" : "Nouvo atik"}
          </h2>
          <button
            type="button"
            onClick={cancel}
            aria-label="Fèmen"
            className="rounded-full px-3 py-1 text-2xl text-stone-500 hover:bg-stone-100"
          >
            ×
          </button>
        </div>

        <div className="flex gap-1 rounded-full border border-stone-200 p-1">
          <button
            type="button"
            onClick={() => setKind("product")}
            className={segment(kind === "product")}
          >
            Pwodui
          </button>
          <button
            type="button"
            onClick={() => setKind("service")}
            className={segment(kind === "service")}
          >
            Sèvis
          </button>
        </div>

        <label className="block">
          <span className={label}>Non *</span>
          <input
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            autoFocus
          />
        </label>

        <label className="block">
          <span className={label}>Deskripsyon</span>
          <textarea
            value={description}
            maxLength={300}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} resize-y`}
          />
        </label>

        <div className="flex gap-3">
          <label className="block flex-1">
            <span className={label}>Pri</span>
            <input
              value={price}
              inputMode="decimal"
              onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="Vid = sou demann"
              className={inputClass}
            />
          </label>
          <label className="block w-32">
            <span className={label}>Lajan</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "HTG" | "USD")}
              className={inputClass}
            >
              <option value="HTG">Goud</option>
              <option value="USD">Dola US</option>
            </select>
          </label>
        </div>

        <div>
          <span className={label}>
            Foto ({photos.length}/{MAX_PHOTOS})
          </span>
          <div className="flex flex-wrap gap-3">
            {photos.map((p) => (
              <ImagePicker
                key={p.path}
                label=""
                shape="square"
                path={p.path}
                onPick={() => {}}
                onRemove={() => removePhoto(p.path)}
              />
            ))}
            {photos.length < MAX_PHOTOS && (
              <ImagePicker
                label=""
                shape="square"
                path={null}
                busy={uploading}
                onPick={(f) => void addPhoto(f)}
              />
            )}
          </div>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-brand)]"
          />
          <span className="text-[15px] text-stone-800">Disponib kounye a</span>
        </label>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={cancel}
            className="rounded-full px-5 py-2.5 font-semibold text-stone-600 hover:bg-stone-100"
          >
            Anile
          </button>
          <button
            type="submit"
            disabled={busy || uploading}
            className="rounded-full bg-brand px-6 py-2.5 font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : "Anrejistre"}
          </button>
        </div>
      </form>
    </div>
  );
}
