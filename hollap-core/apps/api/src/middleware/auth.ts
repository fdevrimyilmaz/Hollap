import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";

const accessPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(["TEACHER", "STUDENT", "ASSISTANT"]),
  email: z.string().email(),
  type: z.literal("access"),
});

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const payload = accessPayloadSchema.parse(decoded);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const payload = accessPayloadSchema.parse(decoded);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }
  } catch {
    // Optional auth should not block anonymous access.
  }

  next();
}

export function requireRole(roles: Array<"TEACHER" | "STUDENT" | "ASSISTANT">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
}
