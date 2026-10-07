"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { compact, inr } from "@/lib/api";
import type { ArtistCardData } from "@/lib/types";
import { Avatar } from "./Avatar";

/**
 * Featured-artist hero. The cover photo sits in the dark; a stage light (a masked, brighter copy of the
 * same photo) follows the pointer. With no pointer, or on touch, the light drifts on its own.
 * Reduced-motion users get a still light and no auto-rotation.
 */
export function Spotlight({ artists }: { artists: ArtistCardData[] }) {
  const list = artists.filter((a) => a.coverUrl).slice(0, 4);
  const [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const held = useRef(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const aim = (x: number, y: number) => {
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    };
    const start = el.getBoundingClientRect();
    aim(start.width * 0.6, start.height * 0.4);
    if (reduce) return;

    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      if (!held.current) {
        const r = el.getBoundingClientRect();
        const s = (t - t0) / 1000;
        aim(r.width * (0.5 + 0.32 * Math.sin(s * 0.7)), r.height * (0.4 + 0.18 * Math.sin(s * 1.1 + 1)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const rotate = window.setInterval(() => {
      if (!held.current && list.length > 1) setI((n) => (n + 1) % list.length);
    }, 7000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(rotate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  if (!list.length) return null;
  const a = list[i % list.length];

  return (
    <section
      ref={box}
      className="spot"
      aria-label="Artist in the spotlight"
      onPointerMove={(e) => {
        held.current = true;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      onPointerLeave={() => {
        held.current = false;
      }}
    >
      <img key={`d-${a.id}`} className="layer dim" src={a.coverUrl!} alt="" />
      <img key={`l-${a.id}`} className="layer lit" src={a.coverUrl!} alt="" aria-hidden />
      <div className="beam" />
      <div className="shade" />

      <div className="spot-top">
        <span className="live-pill">
          <i /> In the spotlight
        </span>
        {list.length > 1 && (
          <div className="spot-dots">
            {list.map((x, n) => (
              <button key={x.id} className={n === i ? "on" : ""} onClick={() => setI(n)} aria-label={`Show ${x.stageName}`} aria-current={n === i} />
            ))}
          </div>
        )}
      </div>

      <div className="spot-body">
        <div className="spot-name">
          <Avatar src={a.user.avatarUrl} size={72} alt={a.stageName} />
          <div style={{ minWidth: 0 }}>
            <h2>
              {a.stageName}
              {a.verified && (
                <span className="badge" title="Verified">
                  ✓
                </span>
              )}
            </h2>
            <div className="spot-meta">
              {a.category}
              {a.city ? `, ${a.city}` : ""} · {compact(a._count.followers)} fans
            </div>
          </div>
        </div>
        <div className="spot-act">
          <Link href={`/book/${a.handle}`} className="btn primary">
            {a.priceFrom ? `Book from ${inr(a.priceFrom)}` : "Request a quote"}
          </Link>
          <Link href={`/artists/${a.handle}`} className="btn">
            View profile
          </Link>
        </div>
      </div>
    </section>
  );
}
