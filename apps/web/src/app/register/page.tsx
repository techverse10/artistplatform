"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

const CATEGORIES = ["Musician", "Singer", "DJ", "Dancer", "Painter", "Comedian", "Photographer", "Magician", "Other"];

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"USER" | "ARTIST">(useSearchParams().get("role") === "ARTIST" ? "ARTIST" : "USER");
  const [f, setF] = useState({ name: "", email: "", password: "", handle: "", category: "Musician", city: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register({
        email: f.email,
        password: f.password,
        name: f.name,
        role,
        ...(role === "ARTIST" ? { handle: f.handle.toLowerCase(), category: f.category, city: f.city } : {}),
      });
      router.push(role === "ARTIST" ? "/studio" : "/artists");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth card stack" onSubmit={submit}>
      <div>
        <div className="eyebrow">Join Stagelight</div>
        <h1 style={{ fontSize: "2.2rem", marginTop: 6 }}>Create account</h1>
      </div>

      <div className="toggle" role="tablist" aria-label="Account type">
        <button type="button" className={role === "USER" ? "on" : ""} onClick={() => setRole("USER")}>I’m a fan</button>
        <button type="button" className={role === "ARTIST" ? "on" : ""} onClick={() => setRole("ARTIST")}>I’m an artist</button>
      </div>

      <div className="field">
        <label htmlFor="name">{role === "ARTIST" ? "Stage name" : "Full name"}</label>
        <input id="name" required minLength={2} value={f.name} onChange={set("name")} />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" value={f.email} onChange={set("email")} />
      </div>
      <div className="field">
        <label htmlFor="pw">Password</label>
        <input id="pw" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set("password")} />
      </div>

      {role === "ARTIST" && (
        <>
          <div className="field">
            <label htmlFor="handle">Handle</label>
            <input id="handle" required pattern="[a-zA-Z0-9_]{3,30}" placeholder="your_name" value={f.handle} onChange={set("handle")} />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="cat">Category</label>
              <select id="cat" value={f.category} onChange={set("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" value={f.city} onChange={set("city")} />
            </div>
          </div>
        </>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      <p className="muted small">
        Already have one? <Link href="/login" style={{ color: "var(--amber)" }}>Sign in</Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
