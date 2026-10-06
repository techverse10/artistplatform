import Link from "next/link";
import { compact, inr } from "@/lib/api";
import type { ArtistCardData } from "@/lib/types";

export function Vinyl({ src, size, spin = false, alt = "" }: { src: string | null; size: number; spin?: boolean; alt?: string }) {
  return (
    <div className={spin ? "vinyl spin" : "vinyl"} style={{ width: size, height: size }}>
      {src ? <img src={src} alt={alt} /> : <div className="ph" />}
    </div>
  );
}

export function ArtistCard({ a }: { a: ArtistCardData }) {
  return (
    <Link href={`/artists/${a.handle}`} className="acard rise">
      <div className="cover">{a.coverUrl && <img src={a.coverUrl} alt="" loading="lazy" />}</div>
      <div className="meta">
        <Vinyl src={a.user.avatarUrl} size={62} alt={a.stageName} />
        <h3>
          {a.stageName}
          {a.verified && (
            <span className="badge" title="Verified">
              ✓
            </span>
          )}
        </h3>
        <div className="muted small">
          {a.category}
          {a.city ? ` · ${a.city}` : ""}
        </div>
        <div className="foot">
          <span>{compact(a._count.followers)} fans</span>
          <span className="price-tag">{a.priceFrom ? `from ${inr(a.priceFrom)}` : "Ask for quote"}</span>
        </div>
      </div>
    </Link>
  );
}
