"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, inr } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Booking } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

export default function BookingsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Booking[] | null>(null);

  const load = useCallback(() => {
    api<Booking[]>("/bookings/mine").then(setItems).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (user?.role === "USER") load();
  }, [user, load]);

  if (loading) return <div className="wrap" style={{ paddingTop: 8 }}>Loading…</div>;
  if (!user) return <div className="auth card stack"><p>Please sign in to see your bookings.</p><Link className="btn primary" href="/login?next=/bookings">Sign in</Link></div>;
  if (user.role !== "USER") return <div className="auth card stack"><p>Artists manage requests in the Studio.</p><Link className="btn primary" href="/studio">Open Studio</Link></div>;

  const cancel = async (id: string) => {
    await api(`/bookings/${id}/status`, { method: "PATCH", body: { status: "CANCELLED" } });
    load();
  };

  return (
    <div className="wrap" style={{ paddingTop: 6 }}>
      <div className="eyebrow">Your tickets</div>
      <h1 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", margin: "8px 0 22px" }}>My bookings</h1>
      {items === null ? (
        <p className="muted">Loading…</p>
      ) : items.length ? (
        <div className="stack">
          {items.map((b) => (
            <div key={b.id} className="list-item">
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <Avatar src={b.artist.user.avatarUrl} size={54} />
                <div>
                  <Link href={`/artists/${b.artist.handle}`}><b>{b.artist.stageName}</b></Link>
                  <div className="muted small">{new Date(b.eventDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {b.location}</div>
                  <div className="muted small">{b.package?.title ?? "Custom"} · {inr(b.price)}</div>
                </div>
              </div>
              <div className="row">
                <span className={`status ${b.status}`}>{b.status}</span>
                {(b.status === "PENDING" || b.status === "ACCEPTED") && (
                  <button className="btn sm danger" onClick={() => cancel(b.id)}>Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>No bookings yet.</p>
          <Link className="btn primary" style={{ marginTop: 14 }} href="/artists">Find an artist</Link>
        </div>
      )}
    </div>
  );
}
