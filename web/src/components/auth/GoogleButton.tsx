"use client";

import { useEffect, useRef, useState } from "react";

// Bouton officiel « Se connecter avec Google » (Google Identity Services).
// Il renvoie un jeton d'identité, comme dans l'app : Supabase l'accepte avec
// signInWithIdToken, et la fonction Edge delete-account aussi.
// Google Cloud → client OAuth « Web » → Origines JavaScript autorisées :
// http://localhost:3000 et l'adresse du site.

interface GsiId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    ux_mode?: "popup";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GsiId } };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise: Promise<void> | undefined;

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = undefined;
      reject(new Error("gsi"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function GoogleButton({
  onToken,
  text = "continue_with",
  disabled = false,
}: {
  onToken: (idToken: string) => void;
  text?: "continue_with" | "signin_with";
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const [failed, setFailed] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        const el = ref.current;
        const gsi = window.google?.accounts.id;
        if (cancelled || !el || !gsi) return;
        gsi.initialize({
          client_id: clientId,
          ux_mode: "popup",
          callback: (response) => {
            if (response.credential) onTokenRef.current(response.credential);
          },
        });
        gsi.renderButton(el, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text,
          locale: "fr",
          width: Math.min(el.offsetWidth || 360, 400),
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (!clientId || failed) {
    return (
      <p className="rounded-xl bg-stone-100 px-4 py-3 text-center text-sm text-stone-500">
        Koneksyon Google pa disponib kounye a. Itilize imèl ou.
      </p>
    );
  }

  return (
    <div
      ref={ref}
      aria-disabled={disabled}
      className={`flex min-h-11 w-full justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}
    />
  );
}
