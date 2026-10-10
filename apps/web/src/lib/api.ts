const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(configured);

/** Browser: same-origin ("" -> /api/... proxied by Next) unless a real public API URL is configured. */
export const API_URL = configured && !isLocal ? configured : "";
/** Server components call the API directly. */
const SERVER_API = (process.env.API_ORIGIN || configured || "http://localhost:4000").replace(/\/+$/, "");

/** Uploaded-media links saved as http://localhost:4000/uploads/... only work on the dev machine; make them relative. */
const fixMedia = (text: string) => text.replace(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/uploads\//g, "/uploads/");
function parse<T>(text: string): T {
  return JSON.parse(fixMedia(text)) as T;
}

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

  const data = await res.text().then((t) => parse<unknown>(t)).catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "Request failed");
  return data as T;
}

/** Server-component fetch (no auth). Returns null instead of throwing so pages degrade gracefully. */
export async function serverGet<T>(path: string): Promise<T | null> {
  // Two quick attempts with a timeout: a cold or briefly busy API should not make the hero vanish.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${SERVER_API}/api${path}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (res.ok) return parse<T>(await res.text());
    } catch {
      /* try again */
    }
  }
  return null;
}

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact" }).format(n);
