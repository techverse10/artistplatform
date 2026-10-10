import { serverGet } from "@/lib/api";
import type { ArtistCardData, Post } from "@/lib/types";
import { Feed } from "@/components/Feed";
import { Rail } from "@/components/Rail";
import { HomeTop } from "@/components/HomeTop";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [artists, posts, cats] = await Promise.all([
    serverGet<{ items: ArtistCardData[] }>("/artists?limit=12&sort=popular"),
    serverGet<{ items: Post[]; nextCursor: string | null }>("/posts?limit=10"),
    serverGet<{ category: string; count: number }[]>("/artists/categories"),
  ]);

  const list = artists?.items ?? [];
  const categories = cats ?? [];

  return (
    <div className="home">
      <div className="feed">
        <HomeTop initial={list} />
        <Feed initial={{ items: posts?.items ?? [], nextCursor: posts?.nextCursor ?? null }} categories={categories} />
      </div>
      <Rail artists={list} categories={categories} />
    </div>
  );
}
