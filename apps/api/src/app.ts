import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./lib/env";
import { errorHandler } from "./lib/http";
import { authRouter } from "./routes/auth";
import { artistsRouter } from "./routes/artists";
import { postsRouter, UPLOAD_DIR } from "./routes/posts";
import { bookingsRouter } from "./routes/bookings";

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  // Mobile apps send no Origin header, so requests without one are allowed through.
  app.use(cors({ origin: env.corsOrigins, credentials: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/artists", artistsRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/bookings", bookingsRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);
  return app;
}
