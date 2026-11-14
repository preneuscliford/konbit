import type { Metadata } from "next";
import { Suspense } from "react";
import FollowListView from "@/components/profile/FollowListView";
import { ProfileSkeleton } from "@/components/Skeleton";
import { getRecentPseudos } from "@/lib/data";

export async function generateStaticParams() {
  const pseudos = await getRecentPseudos(20);
  return pseudos.length
    ? pseudos.map((pseudo) => ({ pseudo }))
    : [{ pseudo: "konbit" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/u/[pseudo]/swiv">): Promise<Metadata> {
  const { pseudo } = await params;
  return { title: `Moun @${pseudo} ap swiv`, robots: { index: false } };
}

export default function FollowingPage({
  params,
}: PageProps<"/u/[pseudo]/swiv">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      {params.then(({ pseudo }) => (
        <FollowListView pseudo={pseudo} kind="following" />
      ))}
    </Suspense>
  );
}
