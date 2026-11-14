import type { Metadata } from "next";
import ChangePassword from "@/components/profile/ChangePassword";
import PageHeader from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Chanje modpas",
  robots: { index: false },
};

export default function ChangePasswordPage() {
  return (
    <>
      <PageHeader title="Chanje modpas" back />
      <ChangePassword />
    </>
  );
}
