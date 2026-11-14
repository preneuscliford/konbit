import type { Metadata } from "next";
import DeleteAccount from "@/components/profile/DeleteAccount";
import PageHeader from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Efase kont mwen",
  robots: { index: false },
};

export default function DeleteAccountPage() {
  return (
    <>
      <PageHeader title="Efase kont mwen" back />
      <DeleteAccount />
    </>
  );
}
