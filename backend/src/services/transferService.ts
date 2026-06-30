import { Prisma } from "@prisma/client";
import { getPrisma } from "../database.js";
import { TransferRequest, TransferResponse, AppError } from "../types.js";

/**
 * Executes an atomic transfer between two accounts.
 *
 * Key guarantees:
 * - Atomicity: Both debit and credit happen in a single Prisma interactive transaction.
 *   If either fails, both roll back.
 * - Idempotency: The UNIQUE(transaction_id, user_id) constraint prevents
 *   duplicate entries. If the same transaction_id is resubmitted, we return
 *   the existing result.
 * - Consistency: Balance is checked inside a SERIALIZABLE transaction.
 *
 * @throws AppError 400 for validation failures (negative amount, same account, insufficient funds)
 * @throws AppError 404 if either account doesn't exist
 */
export async function executeTransfer(request: TransferRequest): Promise<TransferResponse> {
  const prisma = getPrisma();
  const { transaction_id, from_user, to_user, amount, notes } = request;

  // ── Input validation ────────────────────────────────────────
  if (amount <= 0) {
    throw new AppError(400, "Transfer amount must be positive");
  }

  if (from_user === to_user) {
    throw new AppError(400, "Cannot transfer to the same account");
  }

  const roundedAmount = Math.round(amount * 100) / 100;

  // ── Idempotency check ───────────────────────────────────────
  const existing = await prisma.ledgerEntry.findFirst({
    where: { transactionId: transaction_id },
  });

  if (existing) {
    return {
      transaction_id,
      from_user,
      to_user,
      amount: roundedAmount,
      timestamp: existing.createdAt.toISOString(),
      status: "duplicate",
    };
  }

  // ── Account existence check ─────────────────────────────────
  const fromAccount = await prisma.account.findUnique({
    where: { userId: from_user },
  });

  if (!fromAccount) {
    throw new AppError(404, `Account '${from_user}' not found`);
  }

  const toAccount = await prisma.account.findUnique({
    where: { userId: to_user },
  });

  if (!toAccount) {
    throw new AppError(404, `Account '${to_user}' not found`);
  }

  // ── Atomic transfer (SERIALIZABLE isolation) ────────────────
  const result = await prisma.$transaction(
    async (tx) => {
      // Check balance inside the transaction
      const balanceResult = await tx.ledgerEntry.aggregate({
        where: { userId: from_user },
        _sum: { amount: true },
      });
      const currentBalance = Number(balanceResult._sum.amount ?? 0);

      if (currentBalance < roundedAmount) {
        throw new AppError(
          400,
          `Insufficient funds. Available: ${currentBalance}, requested: ${roundedAmount}`,
        );
      }

      // Debit the sender
      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction_id,
          userId: from_user,
          amount: -roundedAmount,
          counterpartyId: to_user,
          description: `Transfer to ${to_user}`,
          notes: notes ?? null,
        },
      });

      // Credit the receiver
      const creditEntry = await tx.ledgerEntry.create({
        data: {
          transactionId: transaction_id,
          userId: to_user,
          amount: roundedAmount,
          counterpartyId: from_user,
          description: `Transfer from ${from_user}`,
          notes: notes ?? null,
        },
      });

      return creditEntry.createdAt;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  return {
    transaction_id,
    from_user,
    to_user,
    amount: roundedAmount,
    timestamp: result.toISOString(),
    status: "completed",
  };
}
