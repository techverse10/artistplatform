"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import type { ArtistCardData } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Ic } from "./Icons";

/** Horizontal row of artist avatars, starting with the viewer's own entry point. */
export function Rings({ artists }: { artists: ArtistCardData[] }) {
  const { user } = useAuth();
  const isArtist = user?.role === "ARTIST";
  return (
    <section aria-label="Artists to watch">
      <div className="rings">
        {user?.role !== "USER" && (
          <Link href={isArtist ? "/studio" : "/register?role=ARTIST"} className="ring-item">
            <span className="ring-add">
              <Ic n="plus" />
            </span>
            <span>{isArtist ? "Your stage" : "Join as artist"}</span>
          </Link>
        )}
        {artists.map((a) => (
          <Link key={a.id} href={`/artists/${a.handle}`} className="ring-item">
            <Avatar src={a.user.avatarUrl} size={74} alt="" />
            <span>{a.stageName}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
