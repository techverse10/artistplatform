"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Post } from "@/lib/types";
import { AudioPlayer } from "./AudioPlayer";
import { Avatar } from "./Avatar";

export function PostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post._count.likes);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const toggleLike = async () => {
    if (!user) return;
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

  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-media">
          {post.type === "PHOTO" && <img src={post.mediaUrl} alt={post.caption} />}
          {(post.type === "VIDEO" || post.type === "REEL") && (
            <video src={post.mediaUrl} poster={post.thumbnailUrl ?? undefined} controls autoPlay playsInline loop={post.type === "REEL"} />
          )}
          {post.type === "AUDIO" && (
            <div style={{ padding: 28, width: "100%" }}>
              {post.thumbnailUrl && <img src={post.thumbnailUrl} alt="" style={{ borderRadius: 14, marginBottom: 18 }} />}
              <AudioPlayer src={post.mediaUrl} seed={post.id} title={post.caption} />
            </div>
          )}
        </div>
        <div className="modal-side">
          <div className="spread">
            <Link href={`/artists/${post.artist.handle}`} className="row" onClick={onClose}>
              <Avatar src={post.artist.user.avatarUrl} size={40} />
              <b>{post.artist.stageName}</b>
            </Link>
            <button className="btn sm ghost" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <p>{post.caption}</p>
          <div className="row">
            <button className="btn sm" onClick={toggleLike} disabled={!user} title={user ? "" : "Sign in to like"}>
              {liked ? "♥" : "♡"} {likes}
            </button>
            <span className="muted small">{post._count.comments} comments</span>
          </div>
          {!user && (
            <Link href="/login" className="small muted">
              Sign in to like and comment →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
