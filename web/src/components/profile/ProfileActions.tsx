"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { refreshProfiles } from "@/app/actions/profile";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "@/components/Toaster";
import { follow, isFollowing, unfollow } from "@/lib/profile-actions";

const pill =
  "rounded-full px-5 py-2 text-[15px] font-bold transition disabled:opacity-60";

// Bouton en haut d'un profil : « Modifye pwofil » sur le sien, sinon
// « Swiv » / « W ap swiv » (survol : « Pa swiv ankò »), comme X.
export default function ProfileActions({
  profileId,
  pseudo,
}: {
  profileId: string;
  pseudo: string;
}) {
  const router = useRouter();
  const { ready, userId, profile, canPost } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const mine = userId === profileId;

  useEffect(() => {
    if (!userId || mine) return;
    let cancelled = false;
    isFollowing(userId, profileId)
      .then((v) => !cancelled && setFollowing(v))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, profileId, mine]);

  if (!ready) return <span className="block h-10 w-28" aria-hidden />;

  if (mine) {
    return (
      <Link
        href="/pwofil"
        className={`${pill} border border-stone-300 text-stone-900 hover:bg-stone-100`}
      >
        Modifye pwofil
      </Link>
    );
  }

  if (!userId || !canPost) {
    const next = encodeURIComponent(`/u/${pseudo}`);
    return (
      <Link
        href={`/konekte?next=${next}`}
        className={`${pill} bg-brand text-white hover:opacity-90`}
      >
        Swiv
      </Link>
    );
  }

  async function toggle() {
    if (!userId || following === null) return;
    const next = !following;
    setBusy(true);
    setFollowing(next);
    try {
      if (next) await follow(profileId);
      else await unfollow(userId, profileId);
      // Compteurs des deux profils.
      await refreshProfiles([pseudo, profile?.pseudo ?? ""]);
      router.refresh();
    } catch {
      setFollowing(!next);
      toast("Nou pa ka fè sa kounye a. Eseye ankò.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (following) {
    return (
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className={`${pill} group min-w-[118px] border border-stone-300 text-stone-900 hover:border-red-300 hover:bg-red-50 hover:text-red-700`}
      >
        <span className="group-hover:hidden">W ap swiv</span>
        <span className="hidden group-hover:inline">Pa swiv ankò</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy || following === null}
      className={`${pill} bg-brand text-white hover:opacity-90`}
    >
      Swiv
    </button>
  );
}
