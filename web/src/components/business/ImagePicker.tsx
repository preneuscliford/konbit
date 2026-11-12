"use client";

import { useRef } from "react";
import Image from "next/image";
import { mediaUrl } from "@/lib/storage";

// Choix d'une photo (logo, couverture, article) avec aperçu.
export default function ImagePicker({
  label,
  path,
  previewUrl,
  busy,
  shape = "wide",
  onPick,
  onRemove,
}: {
  label: string;
  path: string | null;
  // Aperçu local d'une photo pas encore envoyée.
  previewUrl?: string | null;
  busy?: boolean;
  shape?: "wide" | "square" | "round";
  onPick: (file: File) => void;
  onRemove?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const src = previewUrl ?? (path ? mediaUrl(path) : null);
  const box =
    shape === "wide"
      ? "aspect-[3/1] w-full rounded-2xl"
      : shape === "round"
        ? "h-24 w-24 rounded-full"
        : "h-24 w-24 rounded-2xl";

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-stone-700">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className={`relative flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-stone-300 bg-stone-50 text-sm font-semibold text-stone-500 hover:border-brand hover:text-brand disabled:opacity-60 ${box}`}
        >
          {src ? (
            <Image
              src={src}
              alt=""
              fill
              sizes="600px"
              className="object-cover"
              unoptimized={!!previewUrl}
            />
          ) : (
            <span>+ Foto</span>
          )}
          {busy && (
            <span className="absolute inset-0 animate-pulse bg-surface/60" />
          )}
        </button>
        {src && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm font-semibold text-brand-red hover:underline"
          >
            Retire
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
