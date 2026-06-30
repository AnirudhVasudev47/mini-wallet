import { Router, Request, Response, NextFunction } from "express";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { executeTransfer } from "../services/transferService.js";

const router = Router();

// All transfer routes require authentication
router.use(requireAuth);

/**
 * POST /api/v1/transfers
 * Execute a money transfer between two accounts.
 *
 * The `from_user` is automatically set to the authenticated user's user_id.
 * The client only needs to provide `transaction_id`, `to_user`, `amount`,
 * and optionally `notes`.
 *
 * Idempotent: re-submitting the same transaction_id returns the existing result
 * with status "duplicate" instead of processing it again.
 */
router.post(
  "/",
  validateBody([
    { field: "transaction_id", type: "string" },
    { field: "to_user", type: "string" },
    { field: "amount", type: "number" },
    { field: "notes", type: "string", required: false },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await executeTransfer({
        transaction_id: req.body.transaction_id,
        from_user: req.user!.userIdSlug,
        to_user: req.body.to_user,
        amount: req.body.amount,
        notes: req.body.notes,
      });
      const statusCode = result.status === "duplicate" ? 200 : 201;
      res.status(statusCode).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
