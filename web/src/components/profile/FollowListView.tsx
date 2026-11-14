import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/shell/PageHeader";
import { getFollowList, getProfile } from "@/lib/data";
import { displayName } from "@/lib/site";

export type FollowKind = "followers" | "following";

const TABS: { kind: FollowKind; label: string; path: string }[] = [
  { kind: "followers", label: "Abòne", path: "abone" },
  { kind: "following", label: "Ap swiv", path: "swiv" },
];

// Liste des abonnés ou des abonnements d'un membre, avec deux onglets (comme X).
export default async function FollowListView({
  pseudo,
  kind,
}: {
  pseudo: string;
  kind: FollowKind;
}) {
  const p = await getProfile(pseudo);
  if (!p) notFound();
  const people = await getFollowList(p.id, p.pseudo, kind);
  const name = displayName(p.display_name, p.pseudo);

  return (
    <>
      <PageHeader title={name} subtitle={`@${p.pseudo}`} back>
        <nav className="flex">
          {TABS.map((t) => {
            const active = t.kind === kind;
            return (
              <Link
                key={t.kind}
                href={`/u/${p.pseudo}/${t.path}`}
                replace
                aria-current={active ? "page" : undefined}
                className="flex flex-1 justify-center hover:bg-stone-100"
              >
                <span
                  className={`border-b-4 py-3 text-[15px] ${
                    active
                      ? "border-brand font-bold text-stone-900"
                      : "border-transparent font-medium text-stone-500"
                  }`}
                >
                  {t.label}{" "}
                  <span className="text-stone-500">
                    {t.kind === "followers"
                      ? p.followers_count
                      : p.following_count}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </PageHeader>

      {people.length === 0 ? (
        <p className="mx-auto max-w-sm px-6 py-16 text-center text-stone-500">
          {kind === "followers"
            ? `Poko gen moun ki swiv ${name}.`
            : `${name} poko swiv pèsonn.`}
        </p>
      ) : (
        <ul>
          {people.map((person) => {
            const personName = displayName(person.display_name, person.pseudo);
            return (
              <li key={person.id} className="border-b border-stone-200">
                <Link
                  href={`/u/${person.pseudo}`}
                  className="flex gap-3 px-4 py-3 hover:bg-stone-50"
                >
                  <Avatar
                    name={personName}
                    avatarPath={person.avatar_path}
                    seed={person.id}
                    size={44}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-stone-900">
                      {personName}
                    </span>
                    <span className="block truncate text-sm text-stone-500">
                      @{person.pseudo}
                    </span>
                    {person.bio && (
                      <span className="mt-1 line-clamp-2 block text-sm text-stone-700">
                        {person.bio}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
