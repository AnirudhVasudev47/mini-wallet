import { Router, Request, Response, NextFunction } from "express";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { executeTransfer } from "../services/transferService.js";

const router = Router();

// All transfer routes require authentication
router.use(requireAuth);

/**
 * @openapi
 * /transfers:
 *   post:
 *     tags: [Transfers]
 *     summary: Execute a transfer
 *     description: |
 *       Transfers funds between two accounts using double-entry bookkeeping.
 *
 *       **Key guarantees:**
 *       - **Atomicity** — Both debit and credit happen in a single SERIALIZABLE transaction
 *       - **Idempotency** — Re-submitting the same `transaction_id` returns the existing result with status `"duplicate"`
 *       - **Consistency** — Balance is verified inside the transaction before debiting
 *
 *       The `from_user` is automatically set to the authenticated user's `user_id`.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransferRequest'
 *     responses:
 *       201:
 *         description: Transfer completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransferResponse'
 *       200:
 *         description: Duplicate transaction (idempotent replay)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransferResponse'
 *       400:
 *         description: Validation error (negative amount, same account, insufficient funds)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Sender or recipient account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
