"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthError,
  authErrorMessage,
  useAuth,
} from "@/components/auth/AuthProvider";
import PasswordInput, {
  passwordStrength,
} from "@/components/auth/PasswordInput";
import { toast } from "@/components/Toaster";

// Changer son mot de passe (comptes e-mail). On revérifie d'abord l'ancien
// mot de passe : une session laissée ouverte ne suffit pas pour le changer.
export default function ChangePassword() {
  const router = useRouter();
  const {
    ready,
    userId,
    session,
    hasPassword,
    signInWithEmail,
    updatePassword,
  } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !userId) router.replace("/konekte?next=%2Fpwofil%2Fmodpas");
  }, [ready, userId, router]);

  if (!ready || !userId) {
    return (
      <div className="mx-auto my-16 h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
    );
  }

  if (!hasPassword) {
    return (
      <p className="mx-auto max-w-sm px-6 py-16 text-center text-stone-600">
        Ou konekte ak Google: se Google ki jere modpas ou. Pa gen modpas pou
        chanje sou Konbit 509.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const strength = passwordStrength(next);
    if (strength === "short")
      return setError("Nouvo modpas la dwe gen omwen 8 karaktè.");
    if (strength === "weak")
      return setError("Nouvo modpas la twò fèb. Chwazi yon lòt ki pi long.");
    if (next !== confirm) return setError("De nouvo modpas yo pa menm.");
    if (next === current)
      return setError("Nouvo modpas la dwe diferan de ansyen an.");
    const email = session?.user.email;
    if (!email) return setError("Gen yon erè. Eseye ankò.");
    setBusy(true);
    setError(null);
    try {
      try {
        await signInWithEmail(email, current);
      } catch (err) {
        if (err instanceof AuthError && err.code === "invalid_credentials")
          throw new Error("current");
        throw err;
      }
      await updatePassword(next);
      toast("Modpas ou chanje.");
      router.push("/pwofil");
    } catch (err) {
      setError(
        err instanceof Error && err.message === "current"
          ? "Ansyen modpas la pa bon."
          : authErrorMessage(err),
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 px-4 py-6">
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-stone-700">
          Modpas ou genyen kounye a
        </span>
        <PasswordInput
          value={current}
          onChange={setCurrent}
          placeholder="Ansyen modpas"
          autoComplete="current-password"
          autoFocus
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-stone-700">
          Nouvo modpas
        </span>
        <PasswordInput
          value={next}
          onChange={setNext}
          placeholder="Omwen 8 karaktè"
          autoComplete="new-password"
          showStrength
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-stone-700">
          Konfime nouvo modpas la
        </span>
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          placeholder="Menm modpas la ankò"
          autoComplete="new-password"
        />
      </label>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={busy || !current || !next || !confirm}
          className="rounded-full bg-brand px-6 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "…" : "Chanje modpas la"}
        </button>
        <Link
          href="/pwofil"
          className="rounded-full px-4 py-3 font-semibold text-stone-600 hover:bg-stone-100"
        >
          Anile
        </Link>
      </div>
    </form>
  );
}
