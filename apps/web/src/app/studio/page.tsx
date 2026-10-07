"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, inr } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ArtistFull, Booking, Post, PostType } from "@/lib/types";

type Tab = "upload" | "requests" | "profile" | "packages";

export default function StudioPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("upload");

  if (loading) return <div className="wrap" style={{ paddingTop: 8 }}>Loading…</div>;
  if (!user) return <div className="auth card stack"><p>Sign in to open your studio.</p><Link className="btn primary" href="/login?next=/studio">Sign in</Link></div>;
  if (user.role !== "ARTIST" || !user.artistProfile)
    return <div className="auth card stack"><p>The Studio is for artist accounts.</p><Link className="btn primary" href="/register?role=ARTIST">Become an artist</Link></div>;

  const handle = user.artistProfile.handle;
  return (
    <div className="wrap" style={{ paddingTop: 6 }}>
      <div className="spread">
        <div>
          <div className="eyebrow">Studio</div>
          <h1 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", margin: "8px 0" }}>Hi, {user.artistProfile.stageName}</h1>
        </div>
        <Link className="btn" href={`/artists/${handle}`}>View public profile</Link>
      </div>

      <div className="tabs">
        {(["upload", "requests", "profile", "packages"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        {tab === "upload" && <UploadPanel handle={handle} />}
        {tab === "requests" && <RequestsPanel />}
        {tab === "profile" && <ProfilePanel />}
        {tab === "packages" && <PackagesPanel handle={handle} />}
      </div>
    </div>
  );
}

/* ───────── Upload & manage posts ───────── */

const ACCEPT: Record<PostType, string> = { PHOTO: "image/*", AUDIO: "audio/*", VIDEO: "video/*", REEL: "video/*" };

function UploadPanel({ handle }: { handle: string }) {
  const [type, setType] = useState<PostType>("PHOTO");
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);

  const load = useCallback(() => {
    api<{ items: Post[] }>(`/posts?handle=${handle}&limit=40`).then((r) => setPosts(r.items)).catch(() => {});
  }, [handle]);
  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError("Choose a file first");
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("type", type);
      form.append("caption", caption);
      form.append("media", file);
      if (thumb) form.append("thumbnail", thumb);
      await api("/posts", { form });
      setFile(null);
      setThumb(null);
      setCaption("");
      (e.target as HTMLFormElement).reset();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await api(`/posts/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="split">
      <form className="card stack" onSubmit={submit}>
        <b>New post</b>
        <div className="chips">
          {(["PHOTO", "REEL", "VIDEO", "AUDIO"] as PostType[]).map((t) => (
            <button type="button" key={t} className={type === t ? "chip on" : "chip"} onClick={() => { setType(t); setFile(null); }}>
              {t[0] + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="file">{type === "REEL" ? "Vertical video" : "File"}</label>
          <input id="file" type="file" accept={ACCEPT[type]} onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        </div>
        {type !== "PHOTO" && (
          <div className="field">
            <label htmlFor="thumb">Cover image (optional)</label>
            <input id="thumb" type="file" accept="image/*" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
          </div>
        )}
        <div className="field">
          <label htmlFor="cap">Caption</label>
          <textarea id="cap" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2000} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" disabled={busy}>{busy ? "Uploading…" : "Publish"}</button>
      </form>

      <div>
        <b>Your posts ({posts.length})</b>
        {posts.length ? (
          <div className="media-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            {posts.map((p) => (
              <div key={p.id} className="tile" style={{ cursor: "default" }}>
                {p.type === "AUDIO" ? <div className="tile audio" style={{ width: "100%", height: "100%" }}>♪</div> : <img src={p.thumbnailUrl ?? p.mediaUrl} alt="" />}
                <span className="tag">{p.type}</span>
                <button className="btn sm danger" style={{ position: "absolute", left: 6, bottom: 6 }} onClick={() => remove(p.id)}>Delete</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ marginTop: 12 }}>Publish your first post.</div>
        )}
      </div>
    </div>
  );
}

/* ───────── Incoming booking requests ───────── */

function RequestsPanel() {
  const [items, setItems] = useState<Booking[] | null>(null);
  const load = useCallback(() => {
    api<Booking[]>("/bookings/incoming").then(setItems).catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);

  const set = async (id: string, status: string) => {
    await api(`/bookings/${id}/status`, { method: "PATCH", body: { status } });
    load();
  };

  if (items === null) return <p className="muted">Loading…</p>;
  if (!items.length) return <div className="empty">No booking requests yet.</div>;
  return (
    <div className="stack">
      {items.map((b) => (
        <div key={b.id} className="list-item">
          <div>
            <b>{b.customer.name}</b> <span className="muted small">· {b.customer.email}</span>
            <div className="muted small">{new Date(b.eventDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {b.location}</div>
            <div className="muted small">{b.package?.title ?? "Custom"} · {inr(b.price)}</div>
            {b.notes && <div className="small" style={{ marginTop: 6 }}>“{b.notes}”</div>}
          </div>
          <div className="row">
            <span className={`status ${b.status}`}>{b.status}</span>
            {b.status === "PENDING" && (
              <>
                <button className="btn sm primary" onClick={() => set(b.id, "ACCEPTED")}>Accept</button>
                <button className="btn sm danger" onClick={() => set(b.id, "REJECTED")}>Decline</button>
              </>
            )}
            {b.status === "ACCEPTED" && <button className="btn sm" onClick={() => set(b.id, "COMPLETED")}>Mark done</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────── Profile editor ───────── */

function ProfilePanel() {
  const { user, reload } = useAuth();
  const p = user!.artistProfile!;
  const [f, setF] = useState({ stageName: p.stageName, bio: p.bio, category: p.category, city: p.city, languages: p.languages.join(", "), coverUrl: p.coverUrl ?? "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await api("/artists/me/profile", {
        method: "PATCH",
        body: {
          stageName: f.stageName,
          bio: f.bio,
          category: f.category,
          city: f.city,
          languages: f.languages.split(",").map((s) => s.trim()).filter(Boolean),
          coverUrl: f.coverUrl || null,
        },
      });
      await reload();
      setMsg("Saved ✓");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form-grid" style={{ maxWidth: 760 }} onSubmit={save}>
      <div className="field"><label htmlFor="sn">Stage name</label><input id="sn" value={f.stageName} onChange={set("stageName")} required /></div>
      <div className="field"><label htmlFor="cat">Category</label><input id="cat" value={f.category} onChange={set("category")} /></div>
      <div className="field"><label htmlFor="city">City</label><input id="city" value={f.city} onChange={set("city")} /></div>
      <div className="field"><label htmlFor="lang">Languages (comma separated)</label><input id="lang" value={f.languages} onChange={set("languages")} /></div>
      <div className="field full"><label htmlFor="cover">Cover image URL</label><input id="cover" type="url" value={f.coverUrl} onChange={set("coverUrl")} placeholder="https://…" /></div>
      <div className="field full"><label htmlFor="bio">Bio</label><textarea id="bio" value={f.bio} onChange={set("bio")} maxLength={1000} /></div>
      <div className="full row"><button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button><span className="muted small">{msg}</span></div>
    </form>
  );
}

/* ───────── Packages ───────── */

function PackagesPanel({ handle }: { handle: string }) {
  const [pkgs, setPkgs] = useState<ArtistFull["packages"]>([]);
  const [f, setF] = useState({ title: "", description: "", price: "", durationMin: "60" });
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<ArtistFull>(`/artists/${handle}`).then((a) => setPkgs(a.packages)).catch(() => {});
  }, [handle]);
  useEffect(load, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api("/artists/me/packages", { body: { title: f.title, description: f.description, price: Number(f.price), durationMin: Number(f.durationMin) } });
      setF({ title: "", description: "", price: "", durationMin: "60" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add package");
    }
  };

  const remove = async (id: string) => {
    await api(`/artists/me/packages/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="split">
      <form className="card stack" onSubmit={add}>
        <b>Add a package</b>
        <div className="field"><label htmlFor="t">Title</label><input id="t" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="field"><label htmlFor="d">Description</label><textarea id="d" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="form-grid">
          <div className="field"><label htmlFor="p">Price (₹)</label><input id="p" type="number" min={0} required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
          <div className="field"><label htmlFor="m">Minutes</label><input id="m" type="number" min={15} value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} /></div>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary">Add package</button>
      </form>
      <div className="stack">
        <b>Your packages</b>
        {pkgs.length ? pkgs.map((p) => (
          <div key={p.id} className="list-item">
            <div><b>{p.title}</b><div className="muted small">{p.durationMin} min · {inr(p.price)}</div></div>
            <button className="btn sm danger" onClick={() => remove(p.id)}>Remove</button>
          </div>
        )) : <div className="empty">No packages yet.</div>}
      </div>
    </div>
  );
}
