import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import AdminHome from "@/components/admin/AdminHome";
import PageHeader from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Administrasyon · Administrasyon",
  robots: { index: false },
};

export default function Page() {
  return (
    <>
      <PageHeader title="Administrasyon" subtitle="Administrasyon" />
      <AdminShell>
        <AdminHome />
      </AdminShell>
    </>
  );
}
