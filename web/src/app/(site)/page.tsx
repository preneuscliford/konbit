import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import KonbitCard from "@/components/KonbitCard";
import { AppButton } from "@/components/SiteChrome";
import { KonbitSkeleton } from "@/components/Skeleton";
import { getCommuneNames, getRecentKonbits } from "@/lib/data";

// Accueil : Konbit 509 présenté simplement comme l'app communautaire ayisyen.
// (Le message « visibilité des business » viendra plus tard, pour les
// entrepreneurs seulement, avec les fonctions business.)

const FEATURES = [
  {
    icon: "M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z",
    title: "Lanse yon konbit",
    text: "Yon diskisyon, yon lide oswa yon pwojè pou kominote w, ak foto ak komin ou.",
  },
  {
    icon: "M17 20h5v-2a3 3 0 0 0-5.4-1.8M17 20H7m10 0v-2c0-.7-.1-1.3-.4-1.8M7 20H2v-2a3 3 0 0 1 5.4-1.8M7 20v-2c0-.7.1-1.3.4-1.8m0 0a5 5 0 0 1 9.2 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    title: "Rasanble moun",
    text: "Moun yo reponn, renmen, swiv ou epi di « Mwen ladan » pou patisipe.",
  },
  {
    icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2",
    title: "Rete enfòme",
    text: "To dola a, tan an nan komin ou ak siyalman kominote a, chak jou.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Kreye kont ou",
    text: "Gratis, ak Google oswa imèl ou. Mete foto, bio ak komin ou.",
  },
  {
    n: "2",
    title: "Lanse konbit ou",
    text: "Yon pwojè, yon lide oswa aktivite w, ak jiska 2 foto, nan komin ou.",
  },
  {
    n: "3",
    title: "Kominote a reponn",
    text: "Moun yo swiv ou, reponn, renmen epi di « Mwen ladan ».",
  },
];

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

function Phone({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2.2rem] bg-[#1c1917] p-2 shadow-2xl shadow-black/30 ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        width={576}
        height={1214}
        className="rounded-[1.8rem]"
        sizes="(max-width: 768px) 60vw, 280px"
      />
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* Héros */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand to-[#0b1238] text-white">
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-red/30 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-24">
          <div>
            <p className="inline-block rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/90 ring-1 ring-white/20">
              Gratis · An kreyòl ak an fransè
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Ann fè <span className="text-[#ffd166]">konbit</span> ansanm
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
              Konbit 509 se aplikasyon kominote ayisyen an : pataje lide w ak
              pwojè w, diskite, epi rasanble moun pou aji ansanm, an Ayiti kou
              nan dyaspora a.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <AppButton light />
              <Link
                href="/konbit"
                className="font-semibold text-white/90 underline-offset-4 hover:underline"
              >
                Gade konbit yo →
              </Link>
            </div>
          </div>
          <div className="relative mx-auto flex w-full max-w-sm justify-center md:max-w-none">
            <Phone
              src="/screens/profile.jpg"
              alt="Pwofil yon asosyasyon nan aplikasyon an"
              className="absolute top-10 -left-2 hidden w-[44%] -rotate-6 opacity-90 sm:block"
            />
            <Phone
              src="/screens/feed.jpg"
              alt="Fil konbit yo nan aplikasyon Konbit 509"
              className="relative w-[62%] sm:ml-24 sm:w-[52%]"
            />
          </div>
        </div>
      </section>

      {/* Ce qu'on peut faire */}
      <section
        id="sa-w-ka-fe"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-20"
      >
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-stone-900">
          Sa w ka fè sou Konbit 509
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-stone-200 bg-surface p-6 shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-brand">
                <Icon d={f.icon} />
              </span>
              <h3 className="mt-4 text-lg font-bold text-stone-900">
                {f.title}
              </h3>
              <p className="mt-2 leading-relaxed text-stone-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="kijan" className="scroll-mt-20 bg-surface py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-stone-900">
            Kijan li mache
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-bold text-stone-900">
                  {s.title}
                </h3>
                <p className="mx-auto mt-2 max-w-xs leading-relaxed text-stone-600">
                  {s.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Derniers konbits */}
      <section
        id="konbit"
        className="mx-auto max-w-2xl scroll-mt-20 px-0 py-16 sm:px-4 md:py-20"
      >
        <h2 className="px-4 text-center text-3xl font-extrabold tracking-tight text-stone-900">
          Dènye konbit yo
        </h2>
        <p className="mt-3 px-4 text-center text-stone-600">
          Sa k ap fèt kounye a sou Konbit 509.
        </p>
        <div className="mt-8 overflow-hidden border-stone-200 bg-surface sm:rounded-2xl sm:border">
          <Suspense fallback={<KonbitSkeleton />}>
            <LatestKonbits />
          </Suspense>
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/konbit"
            className="inline-block rounded-full border border-stone-300 bg-surface px-6 py-3 font-semibold text-stone-800 hover:border-brand hover:text-brand"
          >
            Wè tout konbit yo →
          </Link>
        </div>
      </section>

      {/* Appel final (discret) */}
      <section className="px-4 pb-20 text-center sm:px-6">
        <p className="text-lg font-semibold text-stone-800">
          Kominote a ap tann ou.
        </p>
        <div className="mt-5 flex justify-center">
          <AppButton />
        </div>
        <p className="mt-6 text-sm text-stone-500">
          Kesyon oswa patenarya :{" "}
          <a
            href="mailto:konbit@haitiscope.com"
            className="font-semibold text-brand hover:underline"
          >
            konbit@haitiscope.com
          </a>
        </p>
      </section>
    </>
  );
}

async function LatestKonbits() {
  const [konbits, communes] = await Promise.all([
    getRecentKonbits(10),
    getCommuneNames(),
  ]);
  if (konbits.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-stone-500">
        Premye konbit yo ap vini byento.
      </p>
    );
  }
  return konbits.map((k) => (
    <KonbitCard key={k.id} konbit={k} communes={communes} />
  ));
}
