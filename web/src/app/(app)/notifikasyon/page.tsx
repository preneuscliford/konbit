import type { Metadata } from "next";
import NotificationsList from "@/components/notifications/NotificationsList";
import PageHeader from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Notifikasyon",
  robots: { index: false },
};

// Notifications du compte (chargées côté navigateur, avec la session).
export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifikasyon" />
      <NotificationsList />
    </>
  );
}
