"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import Avatar from "@/components/Avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import TimeAgo from "@/components/feed/TimeAgo";
import { toast } from "@/components/Toaster";
import {
  ACTION_LABELS,
  adminErrorMessage,
  fetchAdminUser,
  moderateUser,
  ROLE_LABELS,
  setUserRole,
  type AdminUser,
  type UserRole,
} from "@/lib/admin";
import { ABUSE_LABELS } from "@/lib/notifications";
import { formatDate } from "@/lib/site";
import { SectionTitle, Spinner } from "./AdminShell";
import SanctionPanel from "./SanctionPanel";

const ASSIGNABLE: Exclude<UserRole, "admin">[] = [
  "user",
  "tester",
  "moderator",
];

// Fiche d'un compte pour l'équipe : état, chiffres, historique, sanctions ;
// rôle et e-mail pour l'admin seulement (la base le revérifie).
export default function AdminUserView({ id }: { id: string }) {
  const { userId, isModerator, isAdmin } = useAuth();
  const [u, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchAdminUser(id)
      .then(setUser)
      .catch((e) => setError(adminErrorMessage(e)));
  }, [id]);

  useEffect(() => {
    if (isModerator) load();
  }, [isModerator, load]);

  async function run(question: string, task: () => Promise<unknown>) {
    if (!window.confirm(question)) return;
    setBusy(true);
    try {
      await task();
      toast("Fèt.");
      load();
    } catch (e) {
      toast(adminErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  if (error)
    return <p className="px-6 py-12 text-center text-stone-500">{error}</p>;
  if (!u) return <Spinner />;

  const name = u.display_name || u.pseudo || "—";
  const restricted =
    u.restricted_until && new Date(u.restricted_until) > new Date();
  const isSelf = u.id === userId;
  // Un modérateur ne peut pas sanctionner un autre membre de l'équipe.
  const canSanction =
    !isSelf && u.role !== "admin" && (isAdmin || u.role !== "moderator");

  return (
    <div className="px-4 pb-10 pt-4">
      <Link
        href="/admin/itilizate"
        className="mb-3 inline-block text-sm font-semibold text-brand hover:underline"
      >
        ‹ Tout itilizatè yo
      </Link>

      <div className="flex items-start gap-4">
        <Avatar name={name} avatarPath={u.avatar_path} seed={u.id} size={56} />
        <div className="min-w-0 flex-1 text-sm text-stone-500">
          <p className="text-lg font-extrabold text-stone-900">{name}</p>
          {u.pseudo && <p>@{u.pseudo}</p>}
          {u.email && <p>{u.email}</p>}
          <p>
            {ROLE_LABELS[u.role]} · manm depi {formatDate(u.created_at)}
          </p>
          <p>
            {u.last_seen_at ? (
              <>
                Dènye aktivite <TimeAgo iso={u.last_seen_at} />
              </>
            ) : (
              "Poko gen aktivite anrejistre"
            )}
          </p>
        </div>
      </div>

      {u.pseudo && (
        <Link
          href={`/u/${u.pseudo}`}
          target="_blank"
          className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Wè pwofil piblik la ↗
        </Link>
      )}

      {(u.suspended_at || restricted) && (
        <div
          className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
            u.suspended_at
              ? "bg-red-50 text-red-800"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          <p className="font-semibold">
            {u.suspended_at
              ? `Kont sispann depi ${formatDate(u.suspended_at)}`
              : `Kont limite jiska ${formatDate(u.restricted_until!)}`}
          </p>
          {/* Lever une sanction : admin seulement (vérifié aussi par la base). */}
          {isAdmin && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(
                  "Leve sanksyon an?\n\nKont lan ap ka pibliye ankò. Kontni ki te retire yo pa tounen otomatikman.",
                  () => moderateUser({ userId: u.id, action: "lift" }),
                )
              }
              className="font-bold text-brand hover:underline disabled:opacity-50"
            >
              Leve sanksyon an
            </button>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        {(
          [
            ["Piblikasyon", u.konbits],
            ["Repons", u.replies],
            ["Siyalman resevwa", u.reports_received],
          ] as [string, number][]
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-stone-200 px-3 py-2.5"
          >
            <p className="text-xl font-extrabold tabular-nums">{value}</p>
            <p className="text-xs text-stone-500">{label}</p>
          </div>
        ))}
      </div>

      {isAdmin && !isSelf && u.role !== "admin" && (
        <>
          <SectionTitle>Wòl</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {ASSIGNABLE.map((role) => (
              <button
                key={role}
                type="button"
                disabled={busy}
                aria-pressed={u.role === role}
                onClick={() =>
                  role !== u.role &&
                  void run(`Bay kont sa a wòl « ${ROLE_LABELS[role]} »?`, () =>
                    setUserRole(u.id, role),
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  u.role === role
                    ? "border-brand bg-blue-50 font-semibold text-brand"
                    : "border-stone-300 text-stone-700 hover:bg-stone-50"
                }`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </>
      )}

      {canSanction && (
        <>
          <SectionTitle>Sanksyon</SectionTitle>
          <SanctionPanel userId={u.id} isAdmin={isAdmin} onDone={load} />
        </>
      )}

      <SectionTitle>Istorik</SectionTitle>
      {u.actions.length === 0 ? (
        <p className="text-sm text-stone-500">Okenn desizyon pou kont sa a.</p>
      ) : (
        <ul className="space-y-3">
          {u.actions.map((a) => (
            <li key={a.id} className="border-l-4 border-stone-200 pl-3">
              <p className="font-bold text-stone-900">
                {ACTION_LABELS[a.action]}
                {a.reason ? ` · ${ABUSE_LABELS[a.reason] ?? a.reason}` : ""}
                {a.until ? ` · jiska ${formatDate(a.until)}` : ""}
              </p>
              {a.note && (
                <p className="text-sm italic text-stone-600">« {a.note} »</p>
              )}
              <p className="text-xs text-stone-500">
                <TimeAgo iso={a.created_at} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
