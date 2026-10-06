import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { HttpError } from "../lib/http";
import { verifyAccess } from "../lib/tokens";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string; role: Role };
    }
  }
}

function readToken(req: Request): string | null {
  const h = req.headers.authorization;
  return h && h.startsWith("Bearer ") ? h.slice(7) : null;
}

/** Populates req.auth when a valid token is present; never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (token) {
    try {
      const p = verifyAccess(token);
      req.auth = { userId: p.sub, role: p.role };
    } catch {
      /* ignore invalid token for optional routes */
    }
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return next(new HttpError(401, "Sign in required"));
  try {
    const p = verifyAccess(token);
    req.auth = { userId: p.sub, role: p.role };
    next();
  } catch {
    next(new HttpError(401, "Session expired"));
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) return next(new HttpError(403, "Not allowed"));
    next();
  };
