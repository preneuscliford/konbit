"use client";

import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { COMPOSE_HREF } from "@/components/shell/nav";

// Haut du fil, comme X : « Kisa w vle mete ansanm? » pour lancer un konbit,
// ou une invitation à se connecter.
export default function ComposePrompt() {
  const { ready, profile } = useAuth();

  if (!ready)
    return <div className="h-[73px] border-b border-stone-200" aria-hidden />;

  if (!profile?.pseudo) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-blue-50/50 px-4 py-3">
        <p className="text-sm text-stone-700">
          Konekte pou w lanse yon konbit, reponn oswa di « Mwen ladan ».
        </p>
        <Link
          href="/konekte?next=%2Fkonbit"
          className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          Konekte
        </Link>
      </div>
    );
  }

  const name = profile.display_name || profile.pseudo;
  return (
    <Link
      href={COMPOSE_HREF}
      className="flex items-center gap-3 border-b border-stone-200 px-4 py-3 hover:bg-stone-50/70"
    >
      <Avatar
        name={name}
        avatarPath={profile.avatar_path}
        seed={profile.id}
        size={42}
      />
      <span className="flex-1 text-[17px] text-stone-400">
        Kisa w vle nou fè ansanm?
      </span>
      <span className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white">
        Lanse
      </span>
    </Link>
  );
}
