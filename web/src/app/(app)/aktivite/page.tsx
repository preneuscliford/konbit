import type { Metadata } from "next";
import ActivityView from "@/components/profile/ActivityView";
import PageHeader from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Aktivite mwen",
  robots: { index: false },
};

export default function ActivityPage() {
  return (
    <>
      <PageHeader
        title="Aktivite mwen"
        subtitle="Piblikasyon, repons, patisipasyon ak j’aime ou yo"
        back
      />
      <ActivityView />
    </>
  );
}
