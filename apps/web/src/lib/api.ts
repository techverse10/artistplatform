export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const KEY = "aa_tokens";

type Tokens = { accessToken: string; refreshToken: string };

export function getTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function setTokens(t: Tokens | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(KEY, JSON.stringify(t));
  else localStorage.removeItem(KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  const t = getTokens();
  if (!t) return false;
  refreshing ??= fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: t.refreshToken }),
  })
    .then(async (r) => {
      if (!r.ok) {
        setTokens(null);
        return false;
      }
      const data = await r.json();
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

interface Opts {
  method?: string;
  body?: unknown;
  form?: FormData;
}

/** Browser API client: attaches the bearer token and transparently refreshes it once on 401. */
export async function api<T = unknown>(path: string, opts: Opts = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {};
  const t = getTokens();
  if (t) headers.Authorization = `Bearer ${t.accessToken}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}/api${path}`, {
    method: opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET"),
    headers,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });

  if (res.status === 401 && !retried && t && (await refresh())) return api<T>(path, opts, true);
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "Request failed");
  return data as T;
}

/** Server-component fetch (no auth). Returns null instead of throwing so pages degrade gracefully. */
export async function serverGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact" }).format(n);
