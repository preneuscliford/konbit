"use client";

import { useEffect } from "react";

// Fenêtre de confirmation (rejoindre ou quitter un konbit…) : évite les
// actions faites par erreur d'un simple toucher.
export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = "Non",
  tone = "brand",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  children?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "brand" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-3xl bg-surface p-6 shadow-2xl sm:rounded-3xl"
      >
        <h2 className="text-xl font-extrabold text-stone-900">{title}</h2>
        {children && (
          <div className="mt-2 text-[15px] leading-relaxed text-stone-600">
            {children}
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className={`rounded-full px-5 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50 ${
              tone === "danger" ? "bg-brand-red" : "bg-brand"
            }`}
          >
            {busy ? "…" : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-stone-300 px-5 py-3 font-semibold text-stone-700 hover:bg-stone-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
