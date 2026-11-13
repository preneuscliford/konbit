"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox, { type ViewerImage } from "./Lightbox";

// Photos d'un article (katalòg) : on les fait défiler du doigt, avec des
// points en dessous ; un toucher ouvre la photo en plein écran.
export default function SwipeGallery({
  images,
  sizes,
  className = "aspect-square",
}: {
  images: ViewerImage[];
  sizes: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className={`relative ${className}`}>
      <div
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
      >
        {images.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Wè foto ${i + 1} an gwo`}
            className="relative h-full w-full shrink-0 snap-center"
          >
            <Image
              src={img.src}
              alt=""
              fill
              sizes={sizes}
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {images.length > 1 && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/45 px-2 py-1.5">
          {images.map((img, i) => (
            <span
              key={img.src}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
            />
          ))}
        </div>
      )}

      {open !== null && (
        <Lightbox images={images} start={open} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
