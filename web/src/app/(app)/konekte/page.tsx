import type { Metadata } from "next";
import { Suspense } from "react";
import SignInForm from "@/components/auth/SignInForm";
import { getCommuneNames } from "@/lib/data";

export const metadata: Metadata = {
  title: "Konekte",
  robots: { index: false },
};

// Connexion / inscription. Le formulaire lit ?next= (page où revenir) : il
// est donc rendu dans un Suspense.
export default async function SignInPage() {
  const names = await getCommuneNames();
  const communes = Object.entries(names)
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <div className="px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-stone-200 bg-surface p-6 shadow-sm sm:p-8">
        <Suspense
          fallback={
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
          }
        >
          <SignInForm communes={communes} />
        </Suspense>
      </div>
    </div>
  );
}
