import Image from "next/image";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import type { KonbitOriginal } from "@/lib/data";
import { formatKonbitRange } from "@/lib/konbit-time";
import { displayName } from "@/lib/site";
import { mediaUrl } from "@/lib/storage";
import TimeAgo from "./TimeAgo";

// Publication d'origine sous un repost avec légende (ou en aperçu dans
// l'écran « Site ») : version compacte ; un clic l'ouvre.
export default function QuotedKonbit({
  original,
  disabled = false,
}: {
  original: KonbitOriginal | null | undefined;
  disabled?: boolean;
}) {
  if (!original) {
    return (
      <p className="mt-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
        Piblikasyon orijinal la pa disponib ankò.
      </p>
    );
  }

  const name = displayName(original.author_name, original.author_pseudo);
  const image = original.media?.find((m) => m.type === "image");
  const isKonbit = original.kind === "konbit" && !!original.title;

  const content = (
    <>
      <span className="flex items-center gap-1.5 text-[13px]">
        <Avatar
          name={name}
          avatarPath={original.author_avatar}
          seed={original.author_id}
          size={20}
        />
        <span className="truncate font-bold text-stone-900">{name}</span>
        <span className="shrink-0 text-stone-500">
          · <TimeAgo iso={original.created_at} />
        </span>
      </span>
      {isKonbit && (
        <>
          <span className="mt-1 block text-[11px] font-extrabold uppercase text-brand">
            Konbit
          </span>
          <span className="block font-extrabold leading-snug text-stone-900">
            {original.title}
          </span>
          {original.starts_at && original.ends_at && (
            <span className="block text-[13px] text-stone-500">
              🗓 {formatKonbitRange(original.starts_at, original.ends_at)}
            </span>
          )}
        </>
      )}
      <span className="mt-1 flex gap-3">
        <span className="line-clamp-3 flex-1 whitespace-pre-line break-words text-[14px] text-stone-700">
          {original.body}
        </span>
        {image && (
          <Image
            src={mediaUrl(image.path)}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        )}
      </span>
    </>
  );

  const box = "mt-2 block rounded-2xl border border-stone-200 px-3.5 py-3";
  return disabled ? (
    <div className={box}>{content}</div>
  ) : (
    <Link href={`/k/${original.id}`} className={`${box} hover:bg-stone-50`}>
      {content}
    </Link>
  );
}
