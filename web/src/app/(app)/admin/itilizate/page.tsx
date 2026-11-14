import type { Metadata } from "next";
import { Suspense } from "react";
import AdminShell, { Spinner } from "@/components/admin/AdminShell";
import UsersPage from "@/components/admin/UsersPage";
import PageHeader from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Itilizatè · Administrasyon",
  robots: { index: false },
};

export default function Page() {
  return (
    <>
      <PageHeader title="Administrasyon" subtitle="Itilizatè" />
      <AdminShell>
        {/* ?id=… lu dans le navigateur. */}
        <Suspense fallback={<Spinner />}>
          <UsersPage />
        </Suspense>
      </AdminShell>
    </>
  );
}
