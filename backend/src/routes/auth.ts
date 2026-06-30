import { Router, Request, Response, NextFunction } from "express";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { register, login, getCurrentUser } from "../services/authService.js";

const router = Router();

/**
 * POST /api/v1/auth/register
 * Create a new user + wallet account.
 */
router.post(
  "/register",
  validateBody([
    { field: "email", type: "string" },
    { field: "password", type: "string" },
    { field: "user_id", type: "string" },
    { field: "name", type: "string" },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, user_id, name } = req.body;
      const result = await register(email, password, user_id, name);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/v1/auth/login
 * Authenticate and receive a JWT.
 */
router.post(
  "/login",
  validateBody([
    { field: "email", type: "string" },
    { field: "password", type: "string" },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await login(email, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/auth/me
 * Get current authenticated user info.
 */
router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getCurrentUser(req.user!);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
