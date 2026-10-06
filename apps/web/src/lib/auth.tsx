"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getTokens, setTokens } from "./api";
import type { User } from "./types";

interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: "USER" | "ARTIST";
  handle?: string;
  category?: string;
  city?: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!getTokens()) {
      setUser(null);
      return;
    }
    try {
      setUser(await api<User>("/auth/me"));
    } catch {
      setTokens(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const finish = useCallback(async (data: { accessToken: string; refreshToken: string }) => {
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    const me = await api<User>("/auth/me");
    setUser(me);
    return me;
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      reload,
      login: async (email, password) => finish(await api("/auth/login", { body: { email, password } })),
      register: async (input) => finish(await api("/auth/register", { body: input })),
      logout: async () => {
        const t = getTokens();
        if (t) await api("/auth/logout", { body: { refreshToken: t.refreshToken } }).catch(() => {});
        setTokens(null);
        setUser(null);
      },
    }),
    [user, loading, reload, finish]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
