import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverGet } from "@/lib/api";
import type { ArtistFull, Post } from "@/lib/types";
import { ProfileView } from "./ProfileView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const a = await serverGet<ArtistFull>(`/artists/${handle}`);
  if (!a) return { title: "Artist not found" };
  return {
    title: a.stageName,
    description: `${a.stageName} — ${a.category}${a.city ? ` in ${a.city}` : ""}. ${a.bio}`.slice(0, 160),
    openGraph: a.coverUrl ? { images: [a.coverUrl] } : undefined,
  };
}

export default async function ArtistPage({ params }: Props) {
  const { handle } = await params;
  const [artist, posts] = await Promise.all([
    serverGet<ArtistFull>(`/artists/${handle}`),
    serverGet<{ items: Post[] }>(`/posts?handle=${encodeURIComponent(handle)}&limit=40`),
  ]);
  if (!artist) notFound();
  return <ProfileView artist={artist} posts={posts?.items ?? []} />;
}
