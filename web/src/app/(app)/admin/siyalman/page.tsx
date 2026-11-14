import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import ReportsQueue from "@/components/admin/ReportsQueue";
import PageHeader from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Siyalman · Administrasyon",
  robots: { index: false },
};

export default function Page() {
  return (
    <>
      <PageHeader title="Administrasyon" subtitle="Siyalman" />
      <AdminShell>
        <ReportsQueue />
      </AdminShell>
    </>
  );
}
