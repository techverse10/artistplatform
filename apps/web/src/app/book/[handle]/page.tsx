"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, inr } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ArtistFull } from "@/lib/types";

export default function BookPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistFull | null>(null);
  const [missing, setMissing] = useState(false);
  const [pkgId, setPkgId] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<ArtistFull>(`/artists/${handle}`)
      .then((a) => {
        setArtist(a);
        setPkgId(a.packages[0]?.id ?? "");
      })
      .catch(() => setMissing(true));
  }, [handle]);

  if (missing) return <div className="wrap" style={{ paddingTop: 48 }}><div className="empty">Artist not found.</div></div>;
  if (!artist || loading) return <div className="wrap" style={{ paddingTop: 48 }}>Loading…</div>;

  if (!user || user.role !== "USER") {
    return (
      <div className="auth card stack">
        <h1 style={{ fontSize: "1.8rem" }}>{user ? "Fan account needed" : "Sign in to book"}</h1>
        <p className="muted">
          {user ? "Artist accounts can’t book other artists. Use a fan account to send a request." : `Create a free fan account to send a booking request to ${artist.stageName}.`}
        </p>
        {!user && (
          <div className="row">
            <Link className="btn primary" href={`/login?next=/book/${handle}`}>Sign in</Link>
            <Link className="btn" href="/register">Create account</Link>
          </div>
        )}
      </div>
    );
  }

  const pkg = artist.packages.find((p) => p.id === pkgId);
  const price = pkg?.price ?? artist.priceFrom;
  const today = new Date().toISOString().slice(0, 16);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/bookings", {
        body: { artistId: artist.id, packageId: pkgId || undefined, eventDate: new Date(date).toISOString(), location, notes },
      });
      router.push("/bookings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap" style={{ paddingTop: 36 }}>
      <div className="eyebrow">Booking request</div>
      <h1 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", margin: "8px 0 24px" }}>Book {artist.stageName}</h1>

      <form className="split" onSubmit={submit}>
        <div className="stack">
          {artist.packages.length > 0 && (
            <div className="stack">
              <b>Choose a package</b>
              {artist.packages.map((p) => (
                <label key={p.id} className={p.id === pkgId ? "pkg on" : "pkg"}>
                  <input type="radio" name="pkg" checked={p.id === pkgId} onChange={() => setPkgId(p.id)} />
                  <div className="spread">
                    <b>{p.title}</b>
                    <span className="price-tag">{inr(p.price)}</span>
                  </div>
                  <div className="muted small">{p.description} · {p.durationMin} min</div>
                </label>
              ))}
            </div>
          )}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="date">Date &amp; time</label>
              <input id="date" type="datetime-local" required min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="loc">Venue / city</label>
              <input id="loc" required minLength={2} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. The Grand, Kolkata" />
            </div>
            <div className="field full">
              <label htmlFor="notes">Notes for the artist</label>
              <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Event type, audience size, special requests…" />
            </div>
          </div>
        </div>

        <aside className="ticket" style={{ position: "sticky", top: 84 }}>
          <div className="eyebrow">Admit one</div>
          <h2 style={{ margin: "6px 0" }}>{artist.stageName}</h2>
          <div className="muted small">{artist.category}{artist.city ? ` · ${artist.city}` : ""}</div>
          <hr />
          <div className="spread small"><span className="muted">Package</span><span>{pkg?.title ?? "Custom quote"}</span></div>
          <div className="spread small"><span className="muted">When</span><span>{date ? new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</span></div>
          <hr />
          <div className="spread"><span className="muted">Estimated</span><span className="total">{price ? inr(price) : "TBD"}</span></div>
          {error && <p className="error" role="alert" style={{ marginTop: 10 }}>{error}</p>}
          <button className="btn primary block" style={{ marginTop: 16 }} disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
          <p className="muted small" style={{ marginTop: 10 }}>You won’t be charged yet. The artist reviews and confirms your request.</p>
        </aside>
      </form>
    </div>
  );
}
