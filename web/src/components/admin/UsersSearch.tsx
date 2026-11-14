"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { inputClass } from "@/components/auth/PasswordInput";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  adminErrorMessage,
  ROLE_LABELS,
  searchUsers,
  type AdminUserRow,
} from "@/lib/admin";
import { Spinner } from "./AdminShell";

// Recherche d'un compte par tinon ou nom (vide : les plus récents).
export default function UsersSearch() {
  const { isModerator } = useAuth();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isModerator) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsers(query.trim())
        .then((r) => {
          if (cancelled) return;
          setRows(r);
          setError(null);
        })
        .catch((e) => !cancelled && setError(adminErrorMessage(e)));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isModerator]);

  return (
    <div className="pb-10">
      <div className="px-4 py-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chèche yon tinon oswa yon non"
          className={inputClass}
          autoFocus
        />
      </div>
      {error ? (
        <p className="px-6 py-12 text-center text-stone-500">{error}</p>
      ) : !rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="px-6 py-12 text-center text-stone-500">
          Pa gen kont ki koresponn.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 border-t border-stone-200">
          {rows.map((u) => {
            const name = u.display_name || u.pseudo || "—";
            const restricted =
              u.restricted_until && new Date(u.restricted_until) > new Date();
            return (
              <li key={u.id}>
                <Link
                  href={`/admin/itilizate?id=${u.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50"
                >
                  <Avatar
                    name={name}
                    avatarPath={u.avatar_path}
                    seed={u.id}
                    size={40}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-stone-900">
                      {name}
                    </span>
                    <span className="block truncate text-sm text-stone-500">
                      {u.pseudo ? `@${u.pseudo}` : "(san tinon)"}
                      {u.role !== "user" && ` · ${ROLE_LABELS[u.role]}`}
                    </span>
                  </span>
                  {u.suspended_at ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Sispann
                    </span>
                  ) : restricted ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Limite
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
