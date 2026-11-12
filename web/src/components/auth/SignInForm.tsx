"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LEGAL } from "@/lib/site";
import { AuthError, authErrorMessage, useAuth } from "./AuthProvider";
import GoogleButton from "./GoogleButton";
import PasswordInput, { inputClass, MIN_PASSWORD } from "./PasswordInput";

const PSEUDO_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_DELAY = 60;

// verify : code d'inscription ; reset : code « mot de passe oublié » + nouveau mot de passe.
type Mode = "signIn" | "signUp" | "forgot" | "verify" | "reset";

// Pages après lesquelles on n'a rien à « finir » : la connexion mène au fil.
const TO_FEED = [
  "/",
  "/konekte",
  "/kondisyon",
  "/konfidansyalite",
  "/sekirite-timoun",
];

// Page où revenir après connexion : le fil (/konbit) par défaut ; la page
// d'origine seulement si c'est une page interne où l'on voulait agir
// (konbit, profil, fiche business…).
function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return "/konbit";
  const path = value.split(/[?#]/)[0];
  return TO_FEED.includes(path) ? "/konbit" : value;
}

const primaryClass =
  "flex w-full items-center justify-center rounded-full bg-brand px-5 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const linkClass =
  "font-semibold text-brand hover:underline disabled:cursor-not-allowed disabled:text-stone-400 disabled:no-underline";

// Connexion en deux temps, comme dans l'app : Google ou e-mail + mot de passe
// (confirmé par un code à 6 chiffres), puis pseudo public + commune.
export default function SignInForm({
  communes,
}: {
  communes: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const auth = useAuth();
  const { ready, userId, profile, canPost } = auth;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [pseudo, setPseudo] = useState("");
  const [communeSlug, setCommuneSlug] = useState("");
  // Code de récupération déjà accepté (usage unique) : si le nouveau mot de
  // passe est refusé, on réessaie sans le revérifier.
  const recovered = useRef(false);

  // Compte complet : retour à la page d'origine. Pendant un changement de mot
  // de passe, la session s'ouvre avant la fin : on attend qu'il soit enregistré.
  useEffect(() => {
    if (ready && canPost && mode !== "reset") router.replace(next);
  }, [ready, canPost, mode, next, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setInfo(null);
    setCode("");
  }

  function startCode(nextMode: "verify" | "reset") {
    switchMode(nextMode);
    setResendIn(RESEND_DELAY);
    recovered.current = false;
    if (nextMode === "reset") setPassword("");
  }

  async function run(task: () => Promise<void>) {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await task();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim()))
      return setError("Adrès imèl la pa bon.");
    if (
      mode !== "forgot" &&
      password.length < (mode === "signUp" ? MIN_PASSWORD : 1)
    ) {
      return setError("Omwen 8 karaktè.");
    }
    void run(async () => {
      if (mode === "signIn") {
        try {
          await auth.signInWithEmail(email, password);
        } catch (err) {
          // Inscription jamais confirmée : on renvoie un code et on finit ici.
          if (!(err instanceof AuthError && err.code === "email_not_confirmed"))
            throw err;
          await auth.resendSignupCode(email);
          startCode("verify");
        }
      } else if (mode === "signUp") {
        const { needsConfirmation } = await auth.signUpWithEmail(
          email,
          password,
        );
        if (needsConfirmation) startCode("verify");
      } else {
        await auth.sendPasswordReset(email);
        startCode("reset");
      }
    });
  }

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "reset") {
      if (password.length < MIN_PASSWORD) return setError("Omwen 8 karaktè.");
      void run(async () => {
        if (!recovered.current) {
          await auth.verifyRecoveryCode(email, code);
          recovered.current = true;
        }
        await auth.updatePassword(password);
        setPassword("");
        switchMode("signIn");
        setInfo("Modpas ou chanje.");
      });
    } else {
      // La session s'ouvre : le formulaire passe ensuite au choix du pseudo.
      void run(() => auth.verifySignupCode(email, code));
    }
  }

  function resendCode() {
    void run(async () => {
      if (mode === "reset") await auth.sendPasswordReset(email);
      else await auth.resendSignupCode(email);
      setResendIn(RESEND_DELAY);
      setInfo("Nou voye yon nouvo kòd.");
    });
  }

  function savePseudo(e: React.FormEvent) {
    e.preventDefault();
    if (!PSEUDO_PATTERN.test(pseudo))
      return setError("Tinon an dwe gen 3 a 20 karaktè: lèt, chif oswa _.");
    void run(() =>
      auth.updateProfile({
        pseudo,
        ...(communeSlug ? { commune_slug: communeSlug } : {}),
      }),
    );
  }

  if (!ready || (canPost && mode !== "reset")) {
    return (
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
    );
  }

  const needsPseudo = !!userId && !profile?.pseudo;
  const feedback = (
    <>
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {info}
        </p>
      )}
    </>
  );

  // Étape code (inscription ou mot de passe oublié).
  if (mode === "reset" || (!needsPseudo && mode === "verify")) {
    return (
      <form onSubmit={submitCode} className="space-y-4">
        <h1 className="text-2xl font-extrabold text-stone-900">
          {mode === "reset" ? "Nouvo modpas" : "Konfime imèl ou"}
        </h1>
        <p className="text-stone-600">
          {mode === "reset"
            ? `Si adrès ${email.trim()} gen yon kont, nou voye yon kòd 6 chif ba li. Antre kòd la ak nouvo modpas ou.`
            : `Nou voye yon kòd 6 chif bay ${email.trim()}. Antre l la a.`}
        </p>
        <input
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
          }
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          className={`${inputClass} text-center text-2xl font-bold tracking-[0.5em]`}
        />
        {mode === "reset" && (
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="Nouvo modpas"
            autoComplete="new-password"
            showStrength
          />
        )}
        <button
          type="submit"
          disabled={busy || code.length < 6}
          className={primaryClass}
        >
          {busy ? "…" : mode === "reset" ? "Chanje modpas la" : "Konfime"}
        </button>
        {feedback}
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={resendCode}
            disabled={busy || resendIn > 0}
            className={linkClass}
          >
            {resendIn > 0
              ? `Voye yon lòt kòd (${resendIn}s)`
              : "Voye yon lòt kòd"}
          </button>
          <button
            type="button"
            onClick={() => switchMode(mode === "reset" ? "forgot" : "signUp")}
            className={linkClass}
          >
            Chanje imèl la
          </button>
        </div>
        <p className="text-sm text-stone-500">
          Ou pa wè l? Gade nan dosye Spam la.
        </p>
      </form>
    );
  }

  // Étape pseudo (compte ouvert, mais pas encore de nom public).
  if (needsPseudo) {
    return (
      <form onSubmit={savePseudo} className="space-y-4">
        <h1 className="text-2xl font-extrabold text-stone-900">
          Chwazi yon tinon
        </h1>
        <div className="flex items-center rounded-xl border border-stone-300 bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
          <span className="pl-4 text-lg font-bold text-stone-400">@</span>
          <input
            value={pseudo}
            onChange={(e) =>
              setPseudo(
                e.target.value.replace(/[^A-Za-z0-9_]/g, "").slice(0, 20),
              )
            }
            placeholder="tinon_ou"
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
            className="w-full bg-transparent px-2 py-3 text-stone-900 outline-none placeholder:text-stone-400"
          />
        </div>
        <p className="text-sm text-stone-500">
          3 a 20 karaktè: lèt, chif oswa _
        </p>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-stone-700">
            Komin ou
          </span>
          <select
            value={communeSlug}
            onChange={(e) => setCommuneSlug(e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {communes.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy} className={primaryClass}>
          {busy ? "…" : "Anrejistre"}
        </button>
        {feedback}
        <p className="text-sm text-stone-500">
          Se tinon w sèlman ki parèt. Adrès imèl ou pa janm parèt.
        </p>
      </form>
    );
  }

  // Connexion / inscription / mot de passe oublié.
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-stone-900">
        {mode === "signUp"
          ? "Kreye kont ou"
          : mode === "forgot"
            ? "Ou bliye modpas ou?"
            : "Konekte pou patisipe"}
      </h1>
      <p className="text-stone-600">
        Ou bezwen yon kont pou lanse yon konbit, reponn, oswa di « Mwen ladan ».
        Tout moun ka li san kont.
      </p>

      {mode !== "forgot" && (
        <>
          <GoogleButton
            disabled={busy}
            onToken={(token) =>
              void run(() => auth.signInWithGoogleIdToken(token))
            }
          />
          <div className="flex items-center gap-3 text-sm text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            oswa
            <span className="h-px flex-1 bg-stone-200" />
          </div>
        </>
      )}

      <form onSubmit={submitEmail} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Adrès imèl"
          autoComplete="email"
          className={inputClass}
        />
        {mode !== "forgot" && (
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="Modpas"
            autoComplete={
              mode === "signUp" ? "new-password" : "current-password"
            }
            showStrength={mode === "signUp"}
          />
        )}
        <button type="submit" disabled={busy} className={primaryClass}>
          {busy
            ? "…"
            : mode === "signIn"
              ? "Konekte"
              : mode === "signUp"
                ? "Kreye kont mwen"
                : "Voye kòd la"}
        </button>
      </form>
      {feedback}

      <div className="flex flex-wrap justify-between gap-3 text-sm">
        {mode === "signIn" ? (
          <>
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className={linkClass}
            >
              Ou bliye modpas ou?
            </button>
            <button
              type="button"
              onClick={() => switchMode("signUp")}
              className={linkClass}
            >
              Kreye yon kont
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => switchMode("signIn")}
            className={linkClass}
          >
            Mwen gen yon kont deja
          </button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-stone-500">
        Lè w kontinye, ou dakò ak{" "}
        <Link href={LEGAL.terms} className="underline">
          kondisyon itilizasyon
        </Link>{" "}
        ak{" "}
        <Link href={LEGAL.privacy} className="underline">
          politik konfidansyalite
        </Link>{" "}
        Konbit 509 yo. Se tinon w sèlman ki parèt. Adrès imèl ou pa janm parèt.
      </p>
    </div>
  );
}
