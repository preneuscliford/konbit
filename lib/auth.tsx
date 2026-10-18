import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import * as Linking from "expo-linking";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { unregisterPush } from "./push";
import { supabase } from "./supabase";

// Compte Konbit : connexion Google ou e-mail + mot de passe, puis pseudo
// public (l'adresse e-mail n'est jamais affichée). Jamais lié au jeton anonyme
// du Signalement.

export interface Profile {
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
  Pick<Profile, "pseudo" | "display_name" | "bio" | "avatar_path" | "cover_path" | "commune_slug">
>;

export type AuthErrorCode =
  | "cancelled"
  | "play_services"
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

// Erreurs Supabase Auth ramenées aux cas que l'écran sait traduire.
function fromSupabaseAuth(error: { code?: string; message?: string; status?: number }): AuthError {
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
  if (error.message?.includes("Network request failed")) return new AuthError("offline");
  return new AuthError("failed");
}

// Les liens des e-mails (confirmation, nouveau mot de passe) rouvrent l'app
// sur ces routes. À autoriser dans Supabase : Auth → URL Configuration →
// Redirect URLs → konbit://**
export const EMAIL_CONFIRM_URL = Linking.createURL("auth-callback");
export const PASSWORD_RESET_URL = Linking.createURL("reset-password");

// Preuve d'identité exigée pour supprimer le compte : le mot de passe pour un
// compte e-mail, une nouvelle confirmation Google sinon.
export type DeleteProof = { password: string } | { google: true };

interface AuthValue {
  ready: boolean;
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  // Connecté avec un pseudo : peut publier, répondre, rejoindre.
  canPost: boolean;
  // Compte créé avec e-mail + mot de passe (sinon : Google uniquement).
  hasPassword: boolean;
  // Accès à l'administration (affichage seulement : le serveur revérifie le rôle).
  isModerator: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  // needsConfirmation : un code de confirmation a été envoyé, pas encore de session.
  signUpWithEmail: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  // Code à 6 chiffres reçu par e-mail : confirme l'adresse et ouvre la session.
  verifySignupCode: (email: string, code: string) => Promise<void>;
  resendSignupCode: (email: string) => Promise<void>;
  // Mot de passe oublié : le code reçu par e-mail ouvre la session, puis updatePassword.
  verifyRecoveryCode: (email: string, code: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (proof: DeleteProof) => Promise<void>;
  updateProfile: (changes: ProfileChanges) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

// Après le sélecteur de compte Google, l'app revient au premier plan : on
// attend ce retour (et un court instant) avant d'appeler le réseau.
function waitForForeground(): Promise<void> {
  const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 300));
  if (AppState.currentState === "active") return settle();
  return new Promise((resolve) => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      sub.remove();
      settle().then(resolve);
    });
  });
}

// Ouvre le sélecteur de compte Google et renvoie le jeton d'identité.
// Sert à la connexion et à la reconfirmation avant de supprimer le compte.
async function getGoogleIdToken(): Promise<string> {
  try {
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    if (result.type === "cancelled") throw new AuthError("cancelled");
    const idToken = result.data.idToken;
    if (!idToken) throw new AuthError("failed");
    return idToken;
  } catch (e) {
    if (e instanceof AuthError) throw e;
    // DEVELOPER_ERROR (10) = SHA-1 de la clé de signature ou client OAuth mal configuré.
    if (__DEV__) console.warn("Connexion Google échouée", isErrorWithCode(e) ? e.code : e);
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) {
        throw new AuthError("cancelled");
      }
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new AuthError("play_services");
    }
    throw new AuthError("failed");
  }
}


GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, pseudo, display_name, bio, avatar_path, cover_path, commune_slug, role, created_at")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });

  const signInWithGoogle = useCallback(async () => {
    const idToken = await getGoogleIdToken();
    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
    if (error) throw new AuthError("failed");
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw fromSupabaseAuth(error);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: EMAIL_CONFIRM_URL },
    });
    if (error) throw fromSupabaseAuth(error);
    // Adresse déjà inscrite : Supabase renvoie un utilisateur sans identité
    // (pour ne pas révéler quelles adresses existent).
    if (data.user && data.user.identities?.length === 0) throw new AuthError("user_exists");
    return { needsConfirmation: !data.session };
  }, []);

  const verifySignupCode = useCallback(async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
    if (error) throw fromSupabaseAuth(error);
  }, []);

  const verifyRecoveryCode = useCallback(async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "recovery" });
    if (error) throw fromSupabaseAuth(error);
  }, []);

  const resendSignupCode = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: EMAIL_CONFIRM_URL },
    });
    if (error) throw fromSupabaseAuth(error);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: PASSWORD_RESET_URL });
    if (error) throw fromSupabaseAuth(error);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw fromSupabaseAuth(error);
  }, []);

  const signOut = useCallback(async () => {
    // Avant de perdre la session : ce téléphone ne doit plus recevoir les push du compte.
    await unregisterPush().catch(() => {});
    await GoogleSignin.signOut().catch(() => {});
    await supabase.auth.signOut();
    // Le fil contient "joined" propre à l'utilisateur : on le recharge.
    queryClient.removeQueries({ queryKey: ["profile"] });
    queryClient.invalidateQueries({ queryKey: ["konbits"] });
    queryClient.invalidateQueries({ queryKey: ["flags"] });
  }, [queryClient]);

  // Exigence Google Play : supprimer son compte depuis l'app. La fonction Edge
  // delete-account (supabase/functions) supprime l'utilisateur ; profil,
  // konbits, réponses et participations suivent par cascade.
  // La fonction Edge revérifie la preuve côté serveur avant de supprimer.
  const deleteAccount = useCallback(
    async (proof: DeleteProof) => {
      let body: { password: string } | { googleIdToken: string };
      if ("password" in proof) {
        body = { password: proof.password };
      } else {
        // Force le choix du compte : sinon Google peut renvoyer un ancien jeton.
        await GoogleSignin.signOut().catch(() => {});
        body = { googleIdToken: await getGoogleIdToken() };
        await waitForForeground();
      }
      const invoke = () => supabase.functions.invoke("delete-account", { method: "POST", body });
      let { error } = await invoke();
      // Échec d'envoi (pas de réponse du serveur) : une seconde tentative.
      if (error?.name === "FunctionsFetchError") {
        if (__DEV__) console.warn("delete-account : envoi échoué, nouvel essai", error, (error as { context?: unknown }).context);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        ({ error } = await invoke());
      }
      if (error) {
        if (__DEV__) console.warn("delete-account : erreur", error.name, error.message, (error as { context?: unknown }).context);
        const status = (error as { context?: { status?: number } }).context?.status;
        if (status === 403) throw new AuthError("invalid_credentials");
        if (error.message?.includes("Failed to send")) throw new AuthError("offline");
        throw new AuthError("failed");
      }
      await signOut();
    },
    [signOut],
  );

  const updateProfile = useCallback(
    async (changes: ProfileChanges) => {
      if (!userId) throw new AuthError("failed");
      const { error } = await supabase.from("profiles").update(changes).eq("id", userId);
      if (error) {
        if (error.code === "23505") throw new AuthError("pseudo_taken");
        if (error.code === "23514") throw new AuthError("pseudo_invalid");
        throw new AuthError("failed");
      }
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      // Nom et photo apparaissent dans le fil et sur la page de profil.
      queryClient.invalidateQueries({ queryKey: ["konbits"] });
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
    },
    [userId, queryClient],
  );

  const profile = profileQuery.data ?? null;
  const providers = (session?.user.app_metadata?.providers as string[] | undefined) ?? [];
  const hasPassword = providers.includes("email");
  const value = useMemo<AuthValue>(
    () => ({
      ready,
      session,
      userId,
      profile,
      canPost: !!userId && !!profile?.pseudo,
      hasPassword,
      isModerator: profile?.role === "moderator" || profile?.role === "admin",
      isAdmin: profile?.role === "admin",
      signInWithGoogle,
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
    }),
    [
      ready,
      session,
      userId,
      profile,
      hasPassword,
      signInWithGoogle,
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
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return value;
}
