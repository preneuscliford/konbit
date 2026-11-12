import type { Metadata } from "next";
import { Suspense } from "react";
import ComposeFlow from "@/components/compose/ComposeFlow";
import PageHeader from "@/components/shell/PageHeader";
import { getCommuneNames } from "@/lib/data";

export const metadata: Metadata = {
  title: "Lanse yon konbit",
  robots: { index: false },
};

// Lancer un konbit (en 4 étapes) ou partager un simple message.
export default async function ComposePage() {
  const names = await getCommuneNames();
  const communes = Object.entries(names)
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <>
      <PageHeader
        title="Pibliye"
        subtitle="Lanse yon konbit oswa pataje yon mesaj"
        back
      />
      <Suspense
        fallback={
          <div className="mx-auto my-16 h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
        }
      >
        <ComposeFlow communes={communes} />
      </Suspense>
    </>
  );
}
