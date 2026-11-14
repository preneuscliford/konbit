import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AnnouncePanel from "@/components/admin/AnnouncePanel";
import PageHeader from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Anons · Administrasyon",
  robots: { index: false },
};

export default function Page() {
  return (
    <>
      <PageHeader title="Administrasyon" subtitle="Anons" />
      <AdminShell adminOnly>
        <AnnouncePanel />
      </AdminShell>
    </>
  );
}
