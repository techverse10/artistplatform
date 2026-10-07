"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, compact } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ArtistCardData } from "@/lib/types";
import { Avatar } from "./Avatar";

export function Rail({ artists, categories }: { artists: ArtistCardData[]; categories: { category: string; count: number }[] }) {
  const { user } = useAuth();
  const router = useRouter();
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  const toggle = async (id: string) => {
    if (!user) return router.push("/login");
    const next = !followed[id];
    setFollowed((f) => ({ ...f, [id]: next }));
    try {
      await api(`/artists/${id}/follow`, { method: next ? "POST" : "DELETE" });
    } catch {
      setFollowed((f) => ({ ...f, [id]: !next }));
    }
  };

  return (
    <aside className="rail" aria-label="Suggestions">
      {user ? (
        <div className="rcard me-card">
          <div className="rrow" style={{ padding: 0 }}>
            <Avatar src={user.avatarUrl} size={56} alt="" />
            <div className="grow">
              <b>{user.name}</b>
              <span>{user.role === "ARTIST" ? `@${user.artistProfile?.handle ?? ""}` : "Fan account"}</span>
            </div>
          </div>
          {user.role === "ARTIST" ? (
            <Link href="/studio" className="btn primary block">
              Open studio
            </Link>
          ) : (
            <Link href="/bookings" className="btn block">
              My bookings
            </Link>
          )}
        </div>
      ) : (
        <div className="rcard stack">
          <h3 style={{ margin: 0 }}>Join Stagelight</h3>
          <p className="muted small">Follow artists, like their work, and send booking requests in a few taps.</p>
          <Link href="/register" className="btn primary block">
            Create free account
          </Link>
          <Link href="/login" className="btn block">
            Sign in
          </Link>
        </div>
      )}

      {artists.length > 0 && (
        <div className="rcard">
          <h3>
            Artists to follow <Link href="/artists">See all</Link>
          </h3>
          {artists.slice(0, 5).map((a) => (
            <div key={a.id} className="rrow">
              <Link href={`/artists/${a.handle}`}>
                <Avatar src={a.user.avatarUrl} size={46} alt="" />
              </Link>
              <div className="grow">
                <Link href={`/artists/${a.handle}`}>
                  <b>
                    {a.stageName}
                    {a.verified && <span className="badge">✓</span>}
                  </b>
                </Link>
                <span>
                  {a.category}, {compact(a._count.followers)} fans
                </span>
              </div>
              {user?.role !== "ARTIST" && (
                <button className={followed[a.id] ? "btn sm" : "btn sm primary"} onClick={() => toggle(a.id)} aria-pressed={!!followed[a.id]}>
                  {followed[a.id] ? "Following" : "Follow"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {categories.length > 0 && (
        <div className="rcard">
          <h3>Browse by act</h3>
          <div className="row" style={{ gap: 8 }}>
            {categories.map((c) => (
              <Link key={c.category} href={`/artists?category=${encodeURIComponent(c.category)}`} className="chip">
                {c.category}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="promo">
        <h3>Planning an event?</h3>
        <p>Compare packages and send a request. Artists reply with a yes or a new date.</p>
        <Link href="/artists" className="btn sm primary">
          Find an artist
        </Link>
        <img src="/logo-sm.png" alt="" width={124} height={124} />
      </div>
    </aside>
  );
}
