// Squelettes de chargement : la forme du contenu attendu, pendant qu'il arrive
// (utile sur les petites connexions).

function Bar({ className }: { className: string }) {
  return (
    <span
      className={`block animate-pulse rounded-md bg-stone-200 ${className}`}
    />
  );
}

export function KonbitSkeleton() {
  return (
    <div className="flex gap-3 border-b border-stone-200 px-4 py-4">
      <span className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-stone-200" />
      <div className="flex-1 space-y-2.5 pt-1">
        <Bar className="h-3.5 w-1/3" />
        <Bar className="h-3.5 w-full" />
        <Bar className="h-3.5 w-5/6" />
        <Bar className="mt-3 h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div>
      <span className="block h-36 animate-pulse bg-stone-200 sm:h-44" />
      <div className="space-y-3 px-4 pb-6">
        <span className="-mt-10 block h-20 w-20 animate-pulse rounded-full border-4 border-surface bg-stone-200" />
        <Bar className="h-6 w-1/2" />
        <Bar className="h-4 w-1/4" />
        <Bar className="h-4 w-full" />
      </div>
      <KonbitSkeleton />
    </div>
  );
}
