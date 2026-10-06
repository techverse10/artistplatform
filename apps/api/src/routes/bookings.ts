import { Router } from "express";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError, parse, wrap } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";

export const bookingsRouter = Router();

const include = {
  artist: { select: { handle: true, stageName: true, category: true, user: { select: { avatarUrl: true } } } },
  customer: { select: { id: true, name: true, email: true } },
  package: { select: { id: true, title: true } },
};

/** Customer creates a booking request. Price is copied from the package (or artist's "from" price) at request time. */
bookingsRouter.post(
  "/",
  requireAuth,
  requireRole("USER"),
  wrap(async (req, res) => {
    const body = parse(
      z.object({
        artistId: z.string(),
        packageId: z.string().optional(),
        eventDate: z.coerce.date().refine((d) => d.getTime() > Date.now(), "Pick a future date"),
        location: z.string().min(2).max(200),
        notes: z.string().max(1000).default(""),
      }),
      req.body
    );
    const artist = await prisma.artistProfile.findUnique({ where: { id: body.artistId } });
    if (!artist) throw new HttpError(404, "Artist not found");

    let price = artist.priceFrom;
    if (body.packageId) {
      const pkg = await prisma.package.findFirst({ where: { id: body.packageId, artistId: artist.id } });
      if (!pkg) throw new HttpError(400, "packageId: not offered by this artist");
      price = pkg.price;
    }

    const booking = await prisma.booking.create({
      data: {
        customerId: req.auth!.userId,
        artistId: artist.id,
        packageId: body.packageId,
        eventDate: body.eventDate,
        location: body.location,
        notes: body.notes,
        price,
      },
      include,
    });
    res.status(201).json(booking);
  })
);

/** Customer's own bookings */
bookingsRouter.get(
  "/mine",
  requireAuth,
  requireRole("USER"),
  wrap(async (req, res) => {
    res.json(await prisma.booking.findMany({ where: { customerId: req.auth!.userId }, orderBy: { eventDate: "desc" }, include }));
  })
);

/** Artist's incoming requests */
bookingsRouter.get(
  "/incoming",
  requireAuth,
  requireRole("ARTIST"),
  wrap(async (req, res) => {
    const profile = await prisma.artistProfile.findUniqueOrThrow({ where: { userId: req.auth!.userId } });
    res.json(await prisma.booking.findMany({ where: { artistId: profile.id }, orderBy: { eventDate: "asc" }, include }));
  })
);

/**
 * Status transitions:
 *  artist:   PENDING -> ACCEPTED | REJECTED,  ACCEPTED -> COMPLETED
 *  customer: PENDING | ACCEPTED -> CANCELLED
 */
bookingsRouter.patch(
  "/:id/status",
  requireAuth,
  wrap(async (req, res) => {
    const { status } = parse(z.object({ status: z.nativeEnum(BookingStatus) }), req.body);
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { artist: true } });
    if (!booking) throw new HttpError(404, "Booking not found");

    const isArtist = booking.artist.userId === req.auth!.userId;
    const isCustomer = booking.customerId === req.auth!.userId;

    const allowed =
      (isArtist &&
        ((booking.status === "PENDING" && (status === "ACCEPTED" || status === "REJECTED")) ||
          (booking.status === "ACCEPTED" && status === "COMPLETED"))) ||
      (isCustomer && (booking.status === "PENDING" || booking.status === "ACCEPTED") && status === "CANCELLED");

    if (!allowed) throw new HttpError(403, `Cannot change booking from ${booking.status} to ${status}`);
    res.json(await prisma.booking.update({ where: { id: booking.id }, data: { status }, include }));
  })
);
