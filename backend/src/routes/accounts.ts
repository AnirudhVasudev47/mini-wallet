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
 * @openapi
 * /accounts:
 *   get:
 *     tags: [Accounts]
 *     summary: List all accounts
 *     description: Returns all wallet accounts with their computed balances. Available to any authenticated user (needed for transfer recipient selection).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of accounts with balances
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AccountWithBalance'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @openapi
 * /accounts/{id}/balance:
 *   get:
 *     tags: [Accounts]
 *     summary: Get account balance
 *     description: Returns the balance for a specific account. Only the account owner can view their balance.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user_id slug of the account owner
 *         example: alice_01
 *     responses:
 *       200:
 *         description: Account balance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BalanceResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not the account owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @openapi
 * /accounts/{id}/deposit:
 *   post:
 *     tags: [Accounts]
 *     summary: Deposit funds
 *     description: Deposits funds into an account by creating a credit ledger entry from the SYSTEM account. Only the account owner can deposit.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user_id slug of the account owner
 *         example: alice_01
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DepositRequest'
 *     responses:
 *       201:
 *         description: Deposit successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepositResponse'
 *       400:
 *         description: Invalid amount
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
 *       403:
 *         description: Not the account owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @openapi
 * /accounts/{id}/transactions:
 *   get:
 *     tags: [Accounts]
 *     summary: Get transaction history
 *     description: Returns the full transaction history for an account, ordered by most recent first. Only the account owner can view their transactions.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user_id slug of the account owner
 *         example: alice_01
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TransactionView'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not the account owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
