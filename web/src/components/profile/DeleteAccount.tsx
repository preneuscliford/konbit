"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  authErrorMessage,
  AuthError,
  useAuth,
} from "@/components/auth/AuthProvider";
import GoogleButton from "@/components/auth/GoogleButton";
import PasswordInput from "@/components/auth/PasswordInput";
import { toast } from "@/components/Toaster";

// Suppression du compte : irréversible, donc reconfirmée par le mot de passe
// (compte e-mail) ou par Google (compte Google). La fonction Edge revérifie.
export default function DeleteAccount() {
  const router = useRouter();
  const { ready, userId, profile, hasPassword, deleteAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !userId && !busy)
      router.replace("/konekte?next=%2Fpwofil%2Fefase");
  }, [ready, userId, busy, router]);

  async function run(proof: { password: string } | { googleIdToken: string }) {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(proof);
      toast("Kont ou efase. Mèsi paske w te la.");
      router.replace("/");
      router.refresh();
    } catch (e) {
      const wrong = e instanceof AuthError && e.code === "invalid_credentials";
      setError(
        wrong
          ? hasPassword
            ? "Modpas la pa bon."
            : "Konfime ak menm kont Google ou itilize pou Konbit 509."
          : authErrorMessage(e),
      );
      setBusy(false);
    }
  }

  if (!ready || !userId) {
    return (
      <div className="mx-auto my-16 h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-6 py-8 text-center">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl"
        aria-hidden
      >
        ⚠️
      </div>
      <h2 className="text-2xl font-extrabold text-stone-900">Efase kont ou</h2>
      <p className="text-stone-600">
        {profile?.pseudo ? <b>@{profile.pseudo}</b> : "Kont ou"}, pwofil ou,
        konbit ak pòs ou yo, repons ou yo, foto ou yo ak abònman ou yo ap efase
        nèt. Ou p ap ka jwenn yo ankò.
      </p>
      <p className="text-xs text-stone-500">
        Si ou gen yon fich biznis, li ap efase tou.{" "}
        <Link href="/konfidansyalite" className="underline">
          Plis enfòmasyon
        </Link>
      </p>

      <div className="space-y-3 pt-4 text-left">
        {hasPassword ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password) void run({ password });
            }}
            className="space-y-3"
          >
            <p className="text-sm font-semibold text-stone-700">
              Antre modpas ou pou konfime
            </p>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Modpas"
              autoComplete="current-password"
              autoFocus
            />
            <button
              type="submit"
              disabled={busy || !password}
              className="w-full rounded-full bg-brand-red py-3.5 font-extrabold text-white hover:opacity-90 disabled:opacity-45"
            >
              {busy ? "…" : "Efase kont mwen nèt"}
            </button>
          </form>
        ) : (
          <>
            <p className="text-sm font-semibold text-stone-700">
              Konfime ak kont Google ou
            </p>
            <GoogleButton
              text="continue_with"
              disabled={busy}
              onToken={(token) => void run({ googleIdToken: token })}
            />
            {busy && (
              <p className="text-center text-sm text-stone-500">
                N ap efase kont ou…
              </p>
            )}
          </>
        )}
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      <Link
        href="/pwofil"
        className="inline-block pt-2 font-semibold text-brand hover:underline"
      >
        Anile
      </Link>
    </div>
  );
}
