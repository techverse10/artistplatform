"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Post, PostType } from "@/lib/types";
import { PostCard } from "./PostCard";

type Filter = "ALL" | PostType;
const TYPES: { id: Filter; label: string }[] = [
  { id: "ALL", label: "Everything" },
  { id: "REEL", label: "Reels" },
  { id: "AUDIO", label: "Audio" },
  { id: "VIDEO", label: "Video" },
  { id: "PHOTO", label: "Photos" },
];

interface Page {
  items: Post[];
  nextCursor: string | null;
}

export function Feed({ initial, categories }: { initial: Page; categories: { category: string; count: number }[] }) {
  const { user, loading: authLoading } = useAuth();
  const [type, setType] = useState<Filter>("ALL");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<Post[]>(initial.items);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);
  const inflight = useRef(false);
  const first = useRef(true);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (reset: boolean, from: string | null) => {
      if (!reset && inflight.current) return; // never start two "load more" requests at once
      const mine = ++seq.current;
      inflight.current = true;
      const params = new URLSearchParams({ limit: "10" });
      if (type !== "ALL") params.set("type", type);
      if (category) params.set("category", category);
      if (!reset && from) params.set("cursor", from);
      setBusy(true);
      setFailed(false);
      try {
        const page = await api<Page>(`/posts?${params}`);
        if (mine !== seq.current) return; // a newer request replaced this one
        setItems((old) => (reset ? page.items : [...old, ...page.items]));
        setCursor(page.nextCursor);
      } catch {
        if (mine === seq.current) setFailed(true);
      } finally {
        if (mine === seq.current) {
          setBusy(false);
          inflight.current = false;
        }
      }
    },
    [type, category]
  );

  // Reload when filters change or the viewer signs in (so likes show correctly). Skip the very first
  // pass when nothing differs from the server-rendered page.
  useEffect(() => {
    if (authLoading) return;
    const pristine = type === "ALL" && !category && !user;
    if (first.current && pristine) {
      first.current = false;
      return;
    }
    first.current = false;
    load(true, null);
  }, [type, category, user?.id, authLoading, load]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinel.current;
    // After an error, stop auto-loading; the visitor taps "Try again" instead of the app retrying in a loop.
    if (!el || !cursor || failed) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !busy) load(false, cursor);
      },
      { rootMargin: "700px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, busy, failed, load]);

  return (
    <div className="feed">
      <div className="filters">
        <div className="seg" role="tablist" aria-label="Content type">
          {TYPES.map((t) => (
            <button key={t.id} role="tab" aria-selected={type === t.id} className={type === t.id ? "on" : ""} onClick={() => setType(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <div className="chips" aria-label="Filter by act">
            <button className={category ? "chip" : "chip on"} onClick={() => setCategory("")}>
              All acts
            </button>
            {categories.map((c) => (
              <button key={c.category} className={category === c.category ? "chip on" : "chip"} onClick={() => setCategory(c.category)}>
                {c.category}
              </button>
            ))}
          </div>
        )}
      </div>

      {items.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}

      {!items.length && !busy && (
        <div className="empty">
          <p>{failed ? "We couldn’t load the feed." : "No posts match these filters yet."}</p>
          <p className="small">{failed ? "Check that the API is running, then try again." : "Try another act or content type."}</p>
        </div>
      )}
      {failed && items.length > 0 && (
        <button className="btn" onClick={() => load(false, cursor)}>
          Couldn’t load more. Try again
        </button>
      )}
      {busy && <p className="muted small" style={{ textAlign: "center" }}>Loading…</p>}
      <div ref={sentinel} className="sentinel" />
    </div>
  );
}
