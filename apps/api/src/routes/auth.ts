import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError, parse, wrap } from "../lib/http";
import { issueRefreshToken, signAccess } from "../lib/tokens";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, "At least 8 characters"),
  name: z.string().min(2).max(80),
  role: z.enum(["USER", "ARTIST"]).default("USER"),
  // Artist-only fields
  handle: z
    .string()
    .regex(/^[a-z0-9_]{3,30}$/, "3-30 chars: lowercase letters, numbers, underscore")
    .optional(),
  category: z.string().max(40).optional(),
  city: z.string().max(60).optional(),
});

function publicUser(u: { id: string; email: string; name: string; role: string; avatarUrl: string | null }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, avatarUrl: u.avatarUrl };
}

async function session(user: { id: string; role: any; email: string; name: string; avatarUrl: string | null }) {
  return {
    user: publicUser(user),
    accessToken: signAccess(user.id, user.role),
    refreshToken: await issueRefreshToken(user.id),
  };
}

authRouter.post(
  "/register",
  wrap(async (req, res) => {
    const body = parse(registerSchema, req.body);
    if (body.role === "ARTIST" && !body.handle) throw new HttpError(400, "handle: required for artist accounts");

    if (await prisma.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, "Email already registered");
    if (body.handle && (await prisma.artistProfile.findUnique({ where: { handle: body.handle } })))
      throw new HttpError(409, "That handle is taken");

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        role: body.role,
        passwordHash: await bcrypt.hash(body.password, 10),
        ...(body.role === "ARTIST"
          ? {
              artistProfile: {
                create: {
                  handle: body.handle!,
                  stageName: body.name,
                  category: body.category ?? "Musician",
                  city: body.city ?? "",
                },
              },
            }
          : {}),
      },
    });
    res.status(201).json(await session(user));
  })
);

authRouter.post(
  "/login",
  wrap(async (req, res) => {
    const { email, password } = parse(z.object({ email: z.string().email().toLowerCase(), password: z.string() }), req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, "Wrong email or password");
    res.json(await session(user));
  })
);

/** Rotating refresh: old token is deleted, a new pair is returned. */
authRouter.post(
  "/refresh",
  wrap(async (req, res) => {
    const { refreshToken } = parse(z.object({ refreshToken: z.string() }), req.body);
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date()) throw new HttpError(401, "Session expired");
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    res.json(await session(stored.user));
  })
);

authRouter.post(
  "/logout",
  wrap(async (req, res) => {
    const { refreshToken } = parse(z.object({ refreshToken: z.string() }), req.body);
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    res.status(204).end();
  })
);

authRouter.get(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { artistProfile: true },
    });
    if (!user) throw new HttpError(404, "User not found");
    res.json({ ...publicUser(user), artistProfile: user.artistProfile });
  })
);
