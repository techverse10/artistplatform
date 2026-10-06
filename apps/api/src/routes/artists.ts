import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError, parse, wrap } from "../lib/http";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth";

export const artistsRouter = Router();

const card = {
  id: true,
  handle: true,
  stageName: true,
  category: true,
  city: true,
  coverUrl: true,
  priceFrom: true,
  verified: true,
  user: { select: { avatarUrl: true } },
  _count: { select: { followers: true, posts: true } },
} as const;

/** Discover / search. Query: q, category, city, sort=popular|price|new, page, limit */
artistsRouter.get(
  "/",
  wrap(async (req, res) => {
    const q = parse(
      z.object({
        q: z.string().optional(),
        category: z.string().optional(),
        city: z.string().optional(),
        maxPrice: z.coerce.number().optional(),
        sort: z.enum(["popular", "price", "new"]).default("popular"),
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(50).default(20),
      }),
      req.query
    );

    const where = {
      ...(q.category ? { category: { equals: q.category, mode: "insensitive" as const } } : {}),
      ...(q.city ? { city: { contains: q.city, mode: "insensitive" as const } } : {}),
      ...(q.maxPrice ? { priceFrom: { lte: q.maxPrice } } : {}),
      ...(q.q
        ? {
            OR: [
              { stageName: { contains: q.q, mode: "insensitive" as const } },
              { handle: { contains: q.q, mode: "insensitive" as const } },
              { category: { contains: q.q, mode: "insensitive" as const } },
              { bio: { contains: q.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const orderBy =
      q.sort === "price"
        ? { priceFrom: "asc" as const }
        : q.sort === "new"
          ? { createdAt: "desc" as const }
          : { followers: { _count: "desc" as const } };

    const [items, total] = await Promise.all([
      prisma.artistProfile.findMany({ where, orderBy, select: card, skip: (q.page - 1) * q.limit, take: q.limit }),
      prisma.artistProfile.count({ where }),
    ]);
    res.json({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
  })
);

artistsRouter.get(
  "/categories",
  wrap(async (_req, res) => {
    const rows = await prisma.artistProfile.groupBy({ by: ["category"], _count: { _all: true }, orderBy: { _count: { category: "desc" } } });
    res.json(rows.map((r) => ({ category: r.category, count: r._count._all })));
  })
);

artistsRouter.get(
  "/:handle",
  optionalAuth,
  wrap(async (req, res) => {
    const artist = await prisma.artistProfile.findUnique({
      where: { handle: req.params.handle },
      select: { ...card, bio: true, languages: true, packages: { orderBy: { price: "asc" } } },
    });
    if (!artist) throw new HttpError(404, "Artist not found");
    const following = req.auth
      ? !!(await prisma.follow.findUnique({ where: { userId_artistId: { userId: req.auth.userId, artistId: artist.id } } }))
      : false;
    res.json({ ...artist, following });
  })
);

artistsRouter.post(
  "/:id/follow",
  requireAuth,
  wrap(async (req, res) => {
    await prisma.follow.upsert({
      where: { userId_artistId: { userId: req.auth!.userId, artistId: req.params.id } },
      create: { userId: req.auth!.userId, artistId: req.params.id },
      update: {},
    });
    res.status(204).end();
  })
);

artistsRouter.delete(
  "/:id/follow",
  requireAuth,
  wrap(async (req, res) => {
    await prisma.follow.deleteMany({ where: { userId: req.auth!.userId, artistId: req.params.id } });
    res.status(204).end();
  })
);

/* ---------- Artist's own profile + packages (role: ARTIST) ---------- */

artistsRouter.patch(
  "/me/profile",
  requireAuth,
  requireRole("ARTIST"),
  wrap(async (req, res) => {
    const body = parse(
      z.object({
        stageName: z.string().min(1).max(80).optional(),
        bio: z.string().max(1000).optional(),
        category: z.string().max(40).optional(),
        city: z.string().max(60).optional(),
        languages: z.array(z.string()).max(10).optional(),
        priceFrom: z.number().int().min(0).optional(),
        coverUrl: z.string().url().nullable().optional(),
      }),
      req.body
    );
    const updated = await prisma.artistProfile.update({ where: { userId: req.auth!.userId }, data: body });
    res.json(updated);
  })
);

const packageSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().max(400).default(""),
  price: z.number().int().min(0),
  durationMin: z.number().int().min(15).max(1440).default(60),
});

artistsRouter.post(
  "/me/packages",
  requireAuth,
  requireRole("ARTIST"),
  wrap(async (req, res) => {
    const body = parse(packageSchema, req.body);
    const profile = await prisma.artistProfile.findUniqueOrThrow({ where: { userId: req.auth!.userId } });
    const pkg = await prisma.package.create({ data: { ...body, artistId: profile.id } });
    // keep "from" price in sync with the cheapest package
    const min = await prisma.package.aggregate({ where: { artistId: profile.id }, _min: { price: true } });
    await prisma.artistProfile.update({ where: { id: profile.id }, data: { priceFrom: min._min.price ?? 0 } });
    res.status(201).json(pkg);
  })
);

artistsRouter.delete(
  "/me/packages/:packageId",
  requireAuth,
  requireRole("ARTIST"),
  wrap(async (req, res) => {
    const profile = await prisma.artistProfile.findUniqueOrThrow({ where: { userId: req.auth!.userId } });
    await prisma.package.deleteMany({ where: { id: req.params.packageId, artistId: profile.id } });
    res.status(204).end();
  })
);
