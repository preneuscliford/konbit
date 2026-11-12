import Link from "next/link";
import { Footer, Header } from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl bg-surface px-4 py-16 text-center">
          <h1 className="text-2xl font-extrabold">Paj sa a pa egziste</h1>
          <p className="mt-2 text-stone-600">
            Li ka efase, oswa lyen an pa bon.
          </p>
          <Link
            href="/konbit"
            className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-bold text-white"
          >
            Wè konbit yo
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
