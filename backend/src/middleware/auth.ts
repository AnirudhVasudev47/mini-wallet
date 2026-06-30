import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/authService.js";
import { AppError } from "../types.js";

/**
 * Authentication middleware.
 * Extracts JWT from Authorization: Bearer <token> header,
 * verifies it, and attaches the payload to req.user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(401).json({ error: "Authentication failed" });
  }
}

/**
 * Ownership check middleware factory.
 * Verifies that the :id route param matches the authenticated user's user_id.
 */
export function requireOwnership(req: Request, res: Response, next: NextFunction): void {
  const userId = req.params.id as string;

  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.userIdSlug !== userId) {
    res.status(403).json({ error: "You can only access your own account" });
    return;
  }

  next();
}
