import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, ZodTypeAny, z } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Wrap async route handlers so thrown errors reach the error middleware. */
export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.issues[0];
      throw new HttpError(400, `${first.path.join(".") || "body"}: ${first.message}`);
    }
    throw e;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Something went wrong" });
}
