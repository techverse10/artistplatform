import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "./env";
import { prisma } from "./prisma";

export type AccessPayload = { sub: string; role: Role };

export function signAccess(userId: string, role: Role) {
  return jwt.sign({ sub: userId, role } satisfies AccessPayload, env.jwtAccessSecret, { expiresIn: "15m" });
}

export function verifyAccess(token: string): AccessPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessPayload;
}

/** Opaque refresh tokens stored in DB so they can be revoked (logout / rotation). */
export async function issueRefreshToken(userId: string) {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}
