import Link from "next/link";
import { serverGet } from "@/lib/api";
import type { ArtistCardData, Post } from "@/lib/types";
import { ArtistCard } from "@/components/ArtistCard";
import { ReelsStrip } from "@/components/ReelsStrip";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [artists, reels, cats] = await Promise.all([
    serverGet<{ items: ArtistCardData[] }>("/artists?limit=8&sort=popular"),
    serverGet<{ items: Post[] }>("/posts?type=REEL&limit=12"),
    serverGet<{ category: string; count: number }[]>("/artists/categories"),
  ]);

  return (
    <div className="wrap">
      <section className="hero">
        <div className="hero-rings" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="eyebrow">Live talent, one tap away</div>
        <h1 style={{ marginTop: 12 }}>
          Find the artist. <em>Feel the room.</em>
        </h1>
        <p>Watch reels, listen to tracks and see real work from musicians, dancers, DJs and painters. Then book them for your event in minutes.</p>
        <form action="/artists" className="searchbar" role="search">
          <input name="q" placeholder="Try “sitar”, “DJ”, “wedding singer”…" aria-label="Search artists" />
          <button className="btn primary" type="submit">
            Search
          </button>
        </form>
        {!!cats?.length && (
          <div className="chips" style={{ marginTop: 18 }}>
            {cats.map((c) => (
              <Link key={c.category} className="chip" href={`/artists?category=${encodeURIComponent(c.category)}`}>
                {c.category} · {c.count}
              </Link>
            ))}
          </div>
        )}
      </section>

      {!!reels?.items.length && (
        <section className="section">
          <div className="section-head">
            <h2>Now playing</h2>
            <span className="muted small">Fresh reels</span>
          </div>
          <ReelsStrip posts={reels.items} />
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Trending artists</h2>
          <Link href="/artists" className="muted small">
            See all →
          </Link>
        </div>
        {artists?.items.length ? (
          <div className="grid-cards">
            {artists.items.map((a) => (
              <ArtistCard key={a.id} a={a} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <p>No artists to show yet.</p>
            <p className="small">Start the API and run the seed script to see demo artists here.</p>
          </div>
        )}
      </section>

      <section className="section card" style={{ textAlign: "center", padding: "48px 20px" }}>
        <div className="eyebrow">For artists</div>
        <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", margin: "10px 0 14px" }}>Your stage, your rates.</h2>
        <p className="muted" style={{ maxWidth: 520, margin: "0 auto 22px" }}>
          Build a profile fans can follow, share photos, tracks and reels, set your packages and let bookings come to you.
        </p>
        <Link className="btn primary" href="/register?role=ARTIST">
          Create your artist profile
        </Link>
      </section>
    </div>
  );
}
