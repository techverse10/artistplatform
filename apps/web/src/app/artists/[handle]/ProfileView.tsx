"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, compact, inr } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ArtistFull, Post } from "@/lib/types";
import { Vinyl } from "@/components/ArtistCard";
import { PostModal } from "@/components/PostModal";
import { Waveform } from "@/components/AudioPlayer";

type Tab = "ALL" | "REEL" | "AUDIO" | "VIDEO" | "PACKAGES";
const TABS: { id: Tab; label: string }[] = [
  { id: "ALL", label: "Posts" },
  { id: "REEL", label: "Reels" },
  { id: "AUDIO", label: "Audio" },
  { id: "VIDEO", label: "Video" },
  { id: "PACKAGES", label: "Book" },
];

export function ProfileView({ artist, posts }: { artist: ArtistFull; posts: Post[] }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("ALL");
  const [open, setOpen] = useState<Post | null>(null);
  const [following, setFollowing] = useState(artist.following);
  const [fans, setFans] = useState(artist._count.followers);

  // The page is server-rendered without credentials, so load the viewer's follow state on the client.
  useEffect(() => {
    if (user?.role !== "USER") return;
    api<ArtistFull>(`/artists/${artist.handle}`)
      .then((a) => setFollowing(a.following))
      .catch(() => {});
  }, [user, artist.handle]);

  const canBook = !user || user.role === "USER";
  const visible = tab === "ALL" ? posts : posts.filter((p) => p.type === tab);

  const toggleFollow = async () => {
    const next = !following;
    setFollowing(next);
    setFans((n) => n + (next ? 1 : -1));
    try {
      await api(`/artists/${artist.id}/follow`, { method: next ? "POST" : "DELETE" });
    } catch {
      setFollowing(!next);
      setFans((n) => n + (next ? -1 : 1));
    }
  };

  return (
    <>
      <div className="p-cover">{artist.coverUrl && <img src={artist.coverUrl} alt="" />}</div>
      <div className="wrap">
        <div className="p-head">
          <Vinyl src={artist.user.avatarUrl} size={132} spin alt={artist.stageName} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1>
              {artist.stageName}
              {artist.verified && <span className="badge" title="Verified">✓</span>}
            </h1>
            <div className="muted">
              @{artist.handle} · {artist.category}
              {artist.city ? ` · ${artist.city}` : ""}
            </div>
            <div className="p-stats">
              <div><b>{artist._count.posts}</b><span>Posts</span></div>
              <div><b>{compact(fans)}</b><span>Fans</span></div>
              <div><b>{artist.priceFrom ? inr(artist.priceFrom) : "—"}</b><span>From</span></div>
            </div>
          </div>
          <div className="row">
            {user ? (
              user.role === "USER" && (
                <button className={following ? "btn" : "btn primary"} onClick={toggleFollow}>
                  {following ? "Following" : "Follow"}
                </button>
              )
            ) : (
              <Link className="btn" href="/login">Follow</Link>
            )}
            {canBook && (
              <Link className="btn primary" href={`/book/${artist.handle}`}>
                Book now
              </Link>
            )}
          </div>
        </div>

        {artist.bio && <p style={{ maxWidth: 680, margin: "20px 0 0" }}>{artist.bio}</p>}
        {!!artist.languages.length && (
          <div className="chips" style={{ marginTop: 12 }}>
            {artist.languages.map((l) => (
              <span key={l} className="chip">{l}</span>
            ))}
          </div>
        )}

        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "PACKAGES" ? (
          <div className="stack" style={{ marginTop: 20, maxWidth: 720 }}>
            {artist.packages.length ? (
              artist.packages.map((p) => (
                <div key={p.id} className="list-item">
                  <div>
                    <b>{p.title}</b>
                    <div className="muted small">{p.description}</div>
                    <div className="muted small">{p.durationMin} min</div>
                  </div>
                  <div className="price-tag" style={{ fontSize: "1.2rem" }}>{inr(p.price)}</div>
                </div>
              ))
            ) : (
              <div className="empty">This artist hasn’t listed packages yet — send a request and discuss details.</div>
            )}
          </div>
        ) : visible.length ? (
          <div className="media-grid">
            {visible.map((p) => (
              <button key={p.id} className={p.type === "REEL" ? "tile tall" : p.type === "AUDIO" ? "tile audio" : "tile"} onClick={() => setOpen(p)} aria-label={`Open ${p.type.toLowerCase()}`}>
                {p.type === "AUDIO" ? (
                  <div style={{ width: "80%" }}>
                    <Waveform seed={p.id} />
                    <div className="small muted" style={{ marginTop: 6 }}>♪ {p.caption}</div>
                  </div>
                ) : (
                  <img src={p.thumbnailUrl ?? p.mediaUrl} alt={p.caption} loading="lazy" />
                )}
                {p.type !== "PHOTO" && <span className="tag">{p.type}</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ marginTop: 20 }}>Nothing here yet.</div>
        )}
      </div>

      {canBook && (
        <div className="sticky-cta">
          <div>
            <b>{artist.priceFrom ? `from ${inr(artist.priceFrom)}` : "Request a quote"}</b>
            <div className="muted small">{artist.stageName}</div>
          </div>
          <Link className="btn primary" href={`/book/${artist.handle}`}>
            Book now
          </Link>
        </div>
      )}

      {open && <PostModal post={open} onClose={() => setOpen(null)} />}
    </>
  );
}
