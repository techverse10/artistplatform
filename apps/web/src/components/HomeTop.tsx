"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ArtistCardData } from "@/lib/types";
import { Rings } from "./Rings";
import { Spotlight } from "./Spotlight";

/**
 * Hero + artist rings. They come from the server render; if that fetch failed (API asleep or briefly
 * unreachable) we retry from the browser instead of silently showing nothing.
 */
export function HomeTop({ initial }: { initial: ArtistCardData[] }) {
  const [artists, setArtists] = useState(initial);
  const [state, setState] = useState<"ok" | "loading" | "failed">(initial.length ? "ok" : "loading");

  useEffect(() => {
    if (initial.length) return;
    let live = true;
    let tries = 0;
    const go = () => {
      api<{ items: ArtistCardData[] }>("/artists?limit=12&sort=popular")
        .then((r) => {
          if (!live) return;
          setArtists(r.items);
          setState("ok");
        })
        .catch(() => {
          if (!live) return;
          if (++tries < 3) setTimeout(go, 1500 * tries);
          else setState("failed");
        });
    };
    go();
    return () => {
      live = false;
    };
  }, [initial.length]);

  if (state === "loading") {
    return (
      <>
        <div className="spot skeleton" aria-hidden />
        <div className="rings" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="ring-item">
              <span className="avatar sk" style={{ width: 74, height: 74 }} />
              <span className="sk-line" />
            </div>
          ))}
        </div>
      </>
    );
  }
  if (state === "failed" || !artists.length) return null;
  return (
    <>
      <Spotlight artists={artists} />
      <Rings artists={artists} />
    </>
  );
}
