"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, inr } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Post } from "@/lib/types";
import { Avatar } from "./Avatar";
import { AudioPlayer } from "./AudioPlayer";
import { Ic } from "./Icons";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Video / reel that plays muted while at least 60% on screen and pauses when scrolled away. */
function FeedVideo({ post }: { post: Post }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: [0, 0.6] }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <>
      <video
        ref={ref}
        src={post.mediaUrl}
        poster={post.thumbnailUrl ?? undefined}
        loop
        muted
        playsInline
        preload="metadata"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        aria-label={post.caption || `${post.type.toLowerCase()} by ${post.artist.stageName}`}
      />
      {!playing && (
        <div className="playbig">
          <span>
            <Ic n="play" />
          </span>
        </div>
      )}
      <button className="mute" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Turn sound on" : "Turn sound off"}>
        <Ic n={muted ? "mute" : "volume"} />
      </button>
    </>
  );
}

export function PostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post._count.likes);
  const [count, setCount] = useState(post._count.comments);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  // The feed is first rendered without a session; sync when the signed-in version of the post arrives.
  useEffect(() => {
    setLiked(post.liked);
    setLikes(post._count.likes);
  }, [post.liked, post._count.likes]);

  const canBook = !user || user.role === "USER";
  const a = post.artist;

  const toggleLike = async () => {
    if (!user) return router.push("/login");
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      await api(`/posts/${post.id}/like`, { method: next ? "POST" : "DELETE" });
    } catch {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
    }
  };

  const toggleComments = async () => {
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      try {
        setComments(await api<Comment[]>(`/posts/${post.id}/comments`));
      } catch {
        setComments([]);
      }
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError("");
    try {
      const c = await api<Comment>(`/posts/${post.id}/comments`, { body: { body: text.trim() } });
      setComments((list) => [c, ...(list ?? [])]);
      setCount((n) => n + 1);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post your comment");
    }
  };

  return (
    <article className="post">
      <header className="post-h">
        <Link href={`/artists/${a.handle}`} aria-label={`${a.stageName}'s profile`}>
          <Avatar src={a.user.avatarUrl} size={46} alt="" />
        </Link>
        <div className="who">
          <Link href={`/artists/${a.handle}`}>
            <b>
              {a.stageName}
              {a.verified && (
                <span className="badge" title="Verified">
                  ✓
                </span>
              )}
            </b>
          </Link>
          <span>
            {a.category}
            {a.city ? `, ${a.city}` : ""}
          </span>
        </div>
      </header>

      {post.type === "PHOTO" && (
        <div className="pm photo">
          <img src={post.mediaUrl} alt={post.caption || `Photo by ${a.stageName}`} loading="lazy" />
        </div>
      )}
      {(post.type === "REEL" || post.type === "VIDEO") && (
        <div className={post.type === "REEL" ? "pm reel" : "pm video"}>
          <FeedVideo post={post} />
          <span className="kind">{post.type === "REEL" ? "Reel" : "Video"}</span>
        </div>
      )}
      {post.type === "AUDIO" && (
        <div className="pm audio">
          {post.thumbnailUrl && (
            <div className="art">
              <img src={post.thumbnailUrl} alt="" loading="lazy" />
            </div>
          )}
          <AudioPlayer src={post.mediaUrl} seed={post.id} title={post.caption || "Untitled track"} />
        </div>
      )}

      <div className="post-acts">
        <button className={liked ? "icon-btn liked" : "icon-btn"} onClick={toggleLike} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"}>
          <Ic n="heart" />
          {likes}
        </button>
        <button className="icon-btn" onClick={toggleComments} aria-expanded={open} aria-label="Comments">
          <Ic n="comment" />
          {count}
        </button>
        {canBook && (
          <Link href={`/book/${a.handle}`} className="btn sm primary book">
            {a.priceFrom ? `Book from ${inr(a.priceFrom)}` : "Request a quote"}
          </Link>
        )}
      </div>

      <div className="post-cap">
        {post.caption && (
          <p>
            <b>{a.stageName}</b> {post.caption}
          </p>
        )}
        <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>

        {open && (
          <div className="cm">
            {user ? (
              <form onSubmit={send} className="cm-form">
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Add a comment" aria-label="Add a comment" />
                <button className="btn sm primary" disabled={!text.trim()}>
                  Post
                </button>
              </form>
            ) : (
              <Link href="/login" className="small muted">
                Sign in to comment
              </Link>
            )}
            {error && <p className="error">{error}</p>}
            {comments === null ? (
              <p className="muted small">Loading comments…</p>
            ) : comments.length ? (
              <ul className="cm-list">
                {comments.map((c) => (
                  <li key={c.id}>
                    <Avatar src={c.user.avatarUrl} size={30} ring={false} alt="" />
                    <p>
                      <b>{c.user.name}</b> {c.body}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">No comments yet. Be the first.</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
