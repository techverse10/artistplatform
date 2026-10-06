"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ArtistCardData } from "@/lib/types";
import { ArtistCard } from "@/components/ArtistCard";

type Cat = { category: string; count: number };

function Directory() {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [category, setCategory] = useState(sp.get("category") ?? "");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("popular");
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<ArtistCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Cat[]>("/artists/categories").then(setCats).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ sort, limit: "30" });
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    setLoading(true);
    // small debounce so typing doesn't fire a request per keystroke
    const t = setTimeout(() => {
      api<{ items: ArtistCardData[]; total: number }>(`/artists?${params}`)
        .then((r) => {
          setItems(r.items);
          setTotal(r.total);
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, category, city, sort]);

  return (
    <div className="wrap" style={{ paddingTop: 36 }}>
      <div className="eyebrow">Directory</div>
      <h1 style={{ fontSize: "clamp(2rem,5vw,3.4rem)", margin: "8px 0 22px" }}>Artists</h1>

      <div className="form-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
        <input className="input" placeholder="Search name, style, bio…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} aria-label="City" />
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="popular">Most followed</option>
          <option value="price">Lowest price</option>
          <option value="new">Newest</option>
        </select>
      </div>

      <div className="chips" style={{ margin: "16px 0 22px" }}>
        <button className={category ? "chip" : "chip on"} onClick={() => setCategory("")}>
          All
        </button>
        {cats.map((c) => (
          <button key={c.category} className={category === c.category ? "chip on" : "chip"} onClick={() => setCategory(c.category)}>
            {c.category}
          </button>
        ))}
      </div>

      <p className="muted small" style={{ marginBottom: 14 }}>
        {loading ? "Searching…" : `${total} artist${total === 1 ? "" : "s"}`}
      </p>

      {items.length ? (
        <div className="grid-cards">
          {items.map((a) => (
            <ArtistCard key={a.id} a={a} />
          ))}
        </div>
      ) : (
        !loading && <div className="empty">No artists match those filters.</div>
      )}
    </div>
  );
}

export default function ArtistsPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ paddingTop: 36 }}>Loading…</div>}>
      <Directory />
    </Suspense>
  );
}
