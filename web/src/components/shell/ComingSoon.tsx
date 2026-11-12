import { AppButton } from "@/components/SiteChrome";
import PageHeader from "./PageHeader";

// Page prévue sur le site, pas encore construite : on renvoie vers l'app.
export default function ComingSoon({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <>
      <PageHeader title={title} />
      <div className="px-6 py-16 text-center">
        <p className="text-lg font-bold text-stone-900">
          Sa ap vini byento sou sit la
        </p>
        <p className="mx-auto mt-2 max-w-sm text-stone-600">{text}</p>
        <div className="mt-6">
          <AppButton />
        </div>
      </div>
    </>
  );
}
