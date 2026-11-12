"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

// Compte Konbit sur le web : mêmes comptes que l'app (Google ou e-mail +
// mot de passe confirmé par un code), puis pseudo public.

export interface MyProfile {
  id: string;
  pseudo: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  commune_slug: string | null;
  role: "user" | "tester" | "moderator" | "admin";
  created_at: string;
}

export type ProfileChanges = Partial<
  Pick<
    MyProfile,
    | "pseudo"
    | "display_name"
    | "bio"
    | "avatar_path"
    | "cover_path"
    | "commune_slug"
  >
>;

export type AuthErrorCode =
  | "cancelled"
  | "pseudo_taken"
  | "pseudo_invalid"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_exists"
  | "weak_password"
  | "email_invalid"
  | "email_rate_limited"
  | "code_invalid"
  | "offline"
  | "failed";

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
  }
}

// Messages en kreyòl (mêmes textes que l'app).
export const AUTH_ERRORS: Record<AuthErrorCode, string> = {
  cancelled: "",
  pseudo_taken: "Yon lòt moun deja pran tinon sa a.",
  pseudo_invalid: "Tinon an dwe gen 3 a 20 karaktè: lèt, chif oswa _.",
  invalid_credentials: "Imèl oswa modpas la pa bon.",
  email_not_confirmed: "Konfime adrès imèl ou anvan: gade bwat imèl ou.",
  user_exists: "Gen yon kont deja ak adrès sa a. Konekte pito.",
  weak_password: "Modpas la twò fèb. Chwazi yon lòt ki pi long.",
  email_invalid: "Adrès imèl la pa bon.",
  code_invalid: "Kòd la pa bon oswa li ekspire. Mande yon lòt.",
  email_rate_limited: "Twòp esè. Tann kèk minit epi eseye ankò.",
  offline: "Pa gen entènèt. Eseye ankò pita.",
  failed: "Gen yon erè. Eseye ankò.",
};

export function authErrorMessage(e: unknown): string | null {
  const code = e instanceof AuthError ? e.code : "failed";
  return code === "cancelled" ? null : AUTH_ERRORS[code];
}

// Erreurs Supabase Auth ramenées aux cas qu'on sait expliquer.
function fromSupabaseAuth(error: {
  code?: string;
  message?: string;
}): AuthError {
  switch (error.code) {
    case "invalid_credentials":
      return new AuthError("invalid_credentials");
    case "email_not_confirmed":
      return new AuthError("email_not_confirmed");
    case "user_already_exists":
    case "email_exists":
      return new AuthError("user_exists");
    case "weak_password":
      return new AuthError("weak_password");
    case "email_address_invalid":
    case "validation_failed":
      return new AuthError("email_invalid");
    case "otp_expired":
    case "otp_disabled":
      return new AuthError("code_invalid");
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return new AuthError("email_rate_limited");
  }
  if (error.message?.includes("Failed to fetch"))
    return new AuthError("offline");
  return new AuthError("failed");
}

const PROFILE_FIELDS =
  "id, pseudo, display_name, bio, avatar_path, cover_path, commune_slug, role, created_at";

// Preuve d'identité pour supprimer le compte (revérifiée par la fonction Edge).
export type DeleteProof = { password: string } | { googleIdToken: string };

interface AuthValue {
  ready: boolean;
  session: Session | null;
  userId: string | null;
  profile: MyProfile | null;
  // Connecté avec un pseudo : peut publier, répondre, rejoindre.
  canPost: boolean;
  hasPassword: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ needsConfirmation: boolean }>;
  verifySignupCode: (email: string, code: string) => Promise<void>;
  resendSignupCode: (email: string) => Promise<void>;
  verifyRecoveryCode: (email: string, code: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (proof: DeleteProof) => Promise<void>;
  updateProfile: (changes: ProfileChanges) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profileFor, setProfileFor] = useState<string | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setSessionReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    );
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const loadProfile = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("profiles")
        .select(PROFILE_FIELDS)
        .eq("id", id)
        .maybeSingle();
      setProfile((data as MyProfile | null) ?? null);
      setProfileFor(id);
    },
    [supabase],
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile((data as MyProfile | null) ?? null);
        setProfileFor(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, supabase]);

  const signInWithGoogleIdToken = useCallback(
    async (idToken: string) => {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (error) throw fromSupabaseAuth(error);
    },
    [supabase],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw fromSupabaseAuth(error);
    },
    [supabase],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw fromSupabaseAuth(error);
      // Adresse déjà inscrite : utilisateur sans identité (Supabase ne dit pas
      // quelles adresses existent).
      if (data.user && data.user.identities?.length === 0)
        throw new AuthError("user_exists");
      return { needsConfirmation: !data.session };
    },
    [supabase],
  );

  const verifySignupCode = useCallback(
    async (email: string, code: string) => {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "email",
      });
      if (error) throw fromSupabaseAuth(error);
    },
    [supabase],
  );

  const verifyRecoveryCode = useCallback(
    async (email: string, code: string) => {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "recovery",
      });
      if (error) throw fromSupabaseAuth(error);
    },
    [supabase],
  );

  const resendSignupCode = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) throw fromSupabaseAuth(error);
    },
    [supabase],
  );

  const sendPasswordReset = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw fromSupabaseAuth(error);
    },
    [supabase],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw fromSupabaseAuth(error);
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileFor(null);
  }, [supabase]);

  // Même fonction Edge que l'app : elle revérifie la preuve avant de supprimer
  // l'utilisateur (profil, konbits, réponses suivent par cascade).
  const deleteAccount = useCallback(
    async (proof: DeleteProof) => {
      const { error } = await supabase.functions.invoke("delete-account", {
        method: "POST",
        body: proof,
      });
      if (error) {
        const status = (error as { context?: { status?: number } }).context
          ?.status;
        if (status === 403) throw new AuthError("invalid_credentials");
        if (error.message?.includes("Failed to send"))
          throw new AuthError("offline");
        throw new AuthError("failed");
      }
      await signOut();
    },
    [supabase, signOut],
  );

  const updateProfile = useCallback(
    async (changes: ProfileChanges) => {
      if (!userId) throw new AuthError("failed");
      const { error } = await supabase
        .from("profiles")
        .update(changes)
        .eq("id", userId);
      if (error) {
        if (error.code === "23505") throw new AuthError("pseudo_taken");
        if (error.code === "23514") throw new AuthError("pseudo_invalid");
        throw new AuthError("failed");
      }
      await loadProfile(userId);
    },
    [supabase, userId, loadProfile],
  );

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [userId, loadProfile]);

  const providers =
    (session?.user.app_metadata?.providers as string[] | undefined) ?? [];
  const hasPassword = providers.includes("email");
  // Prêt quand la session est connue et, si connecté, le profil chargé.
  const ready = sessionReady && (!userId || profileFor === userId);
  const currentProfile = userId && profileFor === userId ? profile : null;

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      session,
      userId,
      profile: currentProfile,
      canPost: !!userId && !!currentProfile?.pseudo,
      hasPassword,
      isModerator:
        currentProfile?.role === "moderator" ||
        currentProfile?.role === "admin",
      isAdmin: currentProfile?.role === "admin",
      signInWithGoogleIdToken,
      signInWithEmail,
      signUpWithEmail,
      verifySignupCode,
      resendSignupCode,
      verifyRecoveryCode,
      sendPasswordReset,
      updatePassword,
      signOut,
      deleteAccount,
      updateProfile,
      refreshProfile,
    }),
    [
      ready,
      session,
      userId,
      currentProfile,
      hasPassword,
      signInWithGoogleIdToken,
      signInWithEmail,
      signUpWithEmail,
      verifySignupCode,
      resendSignupCode,
      verifyRecoveryCode,
      sendPasswordReset,
      updatePassword,
      signOut,
      deleteAccount,
      updateProfile,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return value;
}
