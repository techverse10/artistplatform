import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Router } from "express";
import multer from "multer";
import { PostType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { HttpError, parse, wrap } from "../lib/http";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth";

export const postsRouter = Router();

export const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * Local-disk storage for development. In production swap this for S3 / Cloudflare R2 / Cloudinary
 * (presigned direct uploads) — the rest of the API only stores the resulting URL.
 */
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
});

const ALLOWED: Record<PostType, string> = {
  PHOTO: "image/",
  AUDIO: "audio/",
  VIDEO: "video/",
  REEL: "video/",
};

const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

const include = (userId?: string) => ({
  artist: {
    select: {
      id: true,
      handle: true,
      stageName: true,
      verified: true,
      category: true,
      city: true,
      priceFrom: true,
      user: { select: { avatarUrl: true } },
    },
  },
  _count: { select: { likes: true, comments: true } },
  ...(userId ? { likes: { where: { userId }, select: { userId: true } } } : {}),
});

function shape(p: any) {
  const { likes, ...rest } = p;
  return { ...rest, liked: Array.isArray(likes) ? likes.length > 0 : false };
}

/** Feed / explore. Query: type, artistId, handle, cursor (post id), limit */
postsRouter.get(
  "/",
  optionalAuth,
  wrap(async (req, res) => {
    const q = parse(
      z.object({
        type: z.nativeEnum(PostType).optional(),
        handle: z.string().optional(),
        category: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.coerce.number().min(1).max(40).default(20),
      }),
      req.query
    );
    const artistWhere = {
      ...(q.handle ? { handle: q.handle } : {}),
      ...(q.category ? { category: { equals: q.category, mode: "insensitive" as const } } : {}),
    };
    const rows = await prisma.post.findMany({
      where: {
        ...(q.type ? { type: q.type } : {}),
        ...(Object.keys(artistWhere).length ? { artist: artistWhere } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: include(req.auth?.userId),
    });
    const hasMore = rows.length > q.limit;
    const items = rows.slice(0, q.limit).map(shape);
    res.json({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
  })
);

/** Create a post: multipart form with fields type, caption, durationSec? and file "media" (+ optional "thumbnail"). */
postsRouter.post(
  "/",
  requireAuth,
  requireRole("ARTIST"),
  upload.fields([
    { name: "media", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  wrap(async (req, res) => {
    const body = parse(
      z.object({
        type: z.nativeEnum(PostType),
        caption: z.string().max(2000).default(""),
        durationSec: z.coerce.number().int().min(0).optional(),
      }),
      req.body
    );
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const media = files?.media?.[0];
    if (!media) throw new HttpError(400, "media: file is required");
    if (!media.mimetype.startsWith(ALLOWED[body.type])) {
      fs.unlink(media.path, () => {});
      throw new HttpError(400, `media: a ${body.type.toLowerCase()} post needs a ${ALLOWED[body.type]}* file`);
    }
    const thumb = files?.thumbnail?.[0];
    const profile = await prisma.artistProfile.findUniqueOrThrow({ where: { userId: req.auth!.userId } });
    const post = await prisma.post.create({
      data: {
        artistId: profile.id,
        type: body.type,
        caption: body.caption,
        durationSec: body.durationSec,
        mediaUrl: `${env.publicApiUrl}/uploads/${media.filename}`,
        thumbnailUrl: thumb ? `${env.publicApiUrl}/uploads/${thumb.filename}` : null,
      },
      include: include(req.auth!.userId),
    });
    res.status(201).json(shape(post));
  })
);

postsRouter.delete(
  "/:id",
  requireAuth,
  requireRole("ARTIST"),
  wrap(async (req, res) => {
    const profile = await prisma.artistProfile.findUniqueOrThrow({ where: { userId: req.auth!.userId } });
    const { count } = await prisma.post.deleteMany({ where: { id: req.params.id, artistId: profile.id } });
    if (!count) throw new HttpError(404, "Post not found");
    res.status(204).end();
  })
);

postsRouter.post(
  "/:id/like",
  requireAuth,
  wrap(async (req, res) => {
    await prisma.like.upsert({
      where: { userId_postId: { userId: req.auth!.userId, postId: req.params.id } },
      create: { userId: req.auth!.userId, postId: req.params.id },
      update: {},
    });
    res.status(204).end();
  })
);

postsRouter.delete(
  "/:id/like",
  requireAuth,
  wrap(async (req, res) => {
    await prisma.like.deleteMany({ where: { userId: req.auth!.userId, postId: req.params.id } });
    res.status(204).end();
  })
);

postsRouter.get(
  "/:id/comments",
  wrap(async (req, res) => {
    const items = await prisma.comment.findMany({
      where: { postId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    res.json(items);
  })
);

postsRouter.post(
  "/:id/comments",
  requireAuth,
  wrap(async (req, res) => {
    const { body } = parse(z.object({ body: z.string().min(1).max(500) }), req.body);
    const c = await prisma.comment.create({
      data: { postId: req.params.id, userId: req.auth!.userId, body },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    res.status(201).json(c);
  })
);
