"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

export interface ViewerImage {
  src: string;
  width: number;
  height: number;
}

// Photos en plein écran : balayage du doigt (ou flèches) d'une photo à
// l'autre, Échap ou × pour fermer.
export default function Lightbox({
  images,
  start = 0,
  onClose,
}: {
  images: ViewerImage[];
  start?: number;
  onClose: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);

  // Ouvre sur la photo touchée, bloque le défilement de la page derrière.
  useEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = start * el.clientWidth;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [start]);

  function go(to: number) {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, to));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }

  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    document.addEventListener("keydown", keys);
    return () => document.removeEventListener("keydown", keys);
  });

  const arrow =
    "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25 sm:flex";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto yo"
      className="fixed inset-0 z-[70] bg-black"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none]"
      >
        {images.map((img, i) => (
          <div
            key={img.src}
            className="relative h-full w-full shrink-0 snap-center"
            onClick={onClose}
          >
            <Image
              src={img.src}
              alt={`Foto ${i + 1}`}
              fill
              sizes="100vw"
              priority={i === start}
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Fèmen"
        className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white hover:bg-white/25"
      >
        ×
      </button>

      {images.length > 1 && (
        <>
          {index > 0 && (
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Foto anvan an"
              className={`${arrow} left-3`}
            >
              ‹
            </button>
          )}
          {index < images.length - 1 && (
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Pwochen foto"
              className={`${arrow} right-3`}
            >
              ›
            </button>
          )}
          <p className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white">
            {index + 1} / {images.length}
          </p>
        </>
      )}
    </div>,
    document.body,
  );
}
