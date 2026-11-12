import Image from "next/image";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import type { Konbit } from "@/lib/data";
import { mediaUrl } from "@/lib/storage";
import { displayName, formatDate, KIND_LABEL } from "@/lib/site";

// Carte d'un konbit, même disposition que dans l'app. `full` : page du konbit.
export default function KonbitCard({
  konbit: k,
  communes,
  full = false,
}: {
  konbit: Konbit;
  communes: Record<string, string>;
  full?: boolean;
}) {
  const name = displayName(k.author_name, k.author_pseudo);
  const images = k.media.filter((m) => m.type === "image").slice(0, 2);

  return (
    <article className="flex gap-3 border-b border-stone-200 px-4 py-4">
      <Link
        href={k.author_pseudo ? `/u/${k.author_pseudo}` : "#"}
        className="shrink-0"
      >
        <Avatar name={name} avatarPath={k.author_avatar} seed={k.author_id} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          {k.author_pseudo ? (
            <Link
              href={`/u/${k.author_pseudo}`}
              className="font-bold text-stone-900 hover:underline"
            >
              {name}
            </Link>
          ) : (
            <span className="font-bold text-stone-900">{name}</span>
          )}
          <span className="text-stone-500">
            {communes[k.commune_slug] ?? k.commune_slug} ·{" "}
            {formatDate(k.created_at)}
          </span>
        </div>
        {k.kind !== "discussion" && (
          <span className="mt-1 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-brand">
            {KIND_LABEL[k.kind]}
          </span>
        )}
        {full ? (
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-stone-900">
            {k.body}
          </p>
        ) : (
          <Link
            href={`/k/${k.id}`}
            className="mt-2 block whitespace-pre-line text-[15px] leading-relaxed text-stone-900"
          >
            {k.body}
          </Link>
        )}
        {images.length > 0 && (
          <div
            className={`mt-3 grid gap-2 ${images.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {images.map((img) => (
              <Image
                key={img.path}
                src={mediaUrl(img.path)}
                alt=""
                width={img.width}
                height={img.height}
                sizes="(max-width: 640px) 90vw, 560px"
                className="max-h-[480px] w-full rounded-2xl object-cover"
              />
            ))}
          </div>
        )}
        <p className="mt-3 text-sm text-stone-500">
          {k.reply_count} repons · {k.like_count} renmen
          {k.kind !== "discussion" && ` · ${k.participant_count} moun ladan`}
        </p>
      </div>
    </article>
  );
}
