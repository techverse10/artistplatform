"use client";

import { useState } from "react";
import type { Post } from "@/lib/types";
import { PostModal } from "./PostModal";

export function ReelsStrip({ posts }: { posts: Post[] }) {
  const [open, setOpen] = useState<Post | null>(null);
  if (!posts.length) return null;
  return (
    <>
      <div className="strip">
        {posts.map((p) => (
          <button key={p.id} className="reel" onClick={() => setOpen(p)} aria-label={`Play reel by ${p.artist.stageName}`}>
            {p.thumbnailUrl && <img src={p.thumbnailUrl} alt="" loading="lazy" />}
            <div className="cap">
              <b>{p.artist.stageName}</b>
              <div className="muted">▶ {p._count.likes} likes</div>
            </div>
          </button>
        ))}
      </div>
      {open && <PostModal post={open} onClose={() => setOpen(null)} />}
    </>
  );
}
