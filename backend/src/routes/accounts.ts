import { Router, Request, Response, NextFunction } from "express";
import { validateBody } from "../middleware/validate.js";
import { requireAuth, requireOwnership } from "../middleware/auth.js";
import {
  listAccounts,
  getBalance,
  deposit,
  getTransactions,
} from "../services/accountService.js";

const router = Router();

// All account routes require authentication
router.use(requireAuth);

/**
 * GET /api/v1/accounts
 * List all accounts with their balances.
 * Available to any authenticated user (needed for transfer recipient selection).
 */
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await listAccounts();
    res.json(accounts);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/accounts/:id/balance
 * Get the balance for a specific account.
 * Only the account owner can view their balance.
 */
router.get("/:id/balance", requireOwnership, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const balance = await getBalance(req.params.id as string);
    res.json(balance);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/accounts/:id/deposit
 * Deposit funds into an account.
 * Only the account owner can deposit.
 */
router.post(
  "/:id/deposit",
  requireOwnership,
  validateBody([{ field: "amount", type: "number" }]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await deposit(req.params.id as string, req.body.amount);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/accounts/:id/transactions
 * Get transaction history for an account.
 * Only the account owner can view their transactions.
 */
router.get(
  "/:id/transactions",
  requireOwnership,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transactions = await getTransactions(req.params.id as string);
      res.json(transactions);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
