"use client";

import { ShareIcon } from "@/components/Icons";
import { toast } from "@/components/Toaster";

// Partager un lien konbit509.app (article ou katalòg) : feuille de partage du
// téléphone, sinon le lien est copié. Visible pour tout le monde.
export default function ShareButton({
  path,
  title,
  label,
  className = "",
}: {
  path: string;
  title: string;
  // Texte à côté de l'icône (sinon icône seule).
  label?: string;
  className?: string;
}) {
  async function share(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Lyen an kopye.");
      }
    } catch {
      // Partage annulé.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={label ?? "Pataje"}
      title="Pataje"
      className={`group flex items-center gap-1.5 rounded-full text-stone-500 hover:text-brand ${className}`}
    >
      <span className="rounded-full p-1.5 group-hover:bg-blue-50">
        <ShareIcon className="h-[18px] w-[18px]" />
      </span>
      {label && <span className="text-sm font-semibold">{label}</span>}
    </button>
  );
}
