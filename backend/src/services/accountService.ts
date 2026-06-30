import { getPrisma } from "../database.js";
import {
  Account,
  AccountWithBalance,
  BalanceResponse,
  TransactionView,
  AppError,
} from "../types.js";

/**
 * Creates a new account with the given user ID and name.
 * @throws AppError 409 if account already exists
 */
export async function createAccount(userId: string, name: string): Promise<Account> {
  const prisma = getPrisma();

  const existing = await prisma.account.findUnique({
    where: { userId },
  });

  if (existing) {
    throw new AppError(409, `Account '${userId}' already exists`);
  }

  const account = await prisma.account.create({
    data: { userId, name },
  });

  return {
    id: account.id,
    user_id: account.userId,
    name: account.name,
    created_at: account.createdAt.toISOString(),
  };
}

/**
 * Returns all accounts (excluding SYSTEM) with their computed balances.
 */
export async function listAccounts(): Promise<AccountWithBalance[]> {
  const prisma = getPrisma();

  // Use raw query for the aggregate balance — Prisma doesn't support
  // SUM across a relation in a single findMany call elegantly.
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      user_id: string;
      name: string;
      created_at: Date;
      balance: string;
    }>
  >`
    SELECT a.id, a.user_id, a.name, a.created_at,
           COALESCE(SUM(l.amount), 0)::NUMERIC(15,2) AS balance
    FROM accounts a
    LEFT JOIN ledger_entries l ON l.user_id = a.user_id
    WHERE a.user_id != 'SYSTEM'
    GROUP BY a.id, a.user_id, a.name, a.created_at
    ORDER BY a.created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    balance: parseFloat(row.balance),
  }));
}

/**
 * Returns the balance for a specific account.
 * @throws AppError 404 if account not found
 */
export async function getBalance(userId: string): Promise<BalanceResponse> {
  const prisma = getPrisma();

  const account = await prisma.account.findUnique({
    where: { userId },
  });

  if (!account) {
    throw new AppError(404, `Account '${userId}' not found`);
  }

  const balance = await getBalanceForAccount(userId);
  return { user_id: userId, balance };
}

/**
 * Deposits funds into an account by creating a credit ledger entry from SYSTEM.
 * Uses a Prisma interactive transaction for consistency.
 * @throws AppError 404 if account not found
 * @throws AppError 400 if amount is invalid
 */
export async function deposit(
  userId: string,
  amount: number,
): Promise<{ transaction_id: string; amount: number; balance: number }> {
  const prisma = getPrisma();

  if (amount <= 0) {
    throw new AppError(400, "Deposit amount must be positive");
  }

  const account = await prisma.account.findUnique({
    where: { userId },
  });

  if (!account) {
    throw new AppError(404, `Account '${userId}' not found`);
  }

  const transactionId = crypto.randomUUID();
  const roundedAmount = Math.round(amount * 100) / 100;

  await prisma.$transaction([
    // Credit the user
    prisma.ledgerEntry.create({
      data: {
        transactionId,
        userId,
        amount: roundedAmount,
        counterpartyId: "SYSTEM",
        description: "Deposit",
      },
    }),
    // Debit SYSTEM
    prisma.ledgerEntry.create({
      data: {
        transactionId,
        userId: "SYSTEM",
        amount: -roundedAmount,
        counterpartyId: userId,
        description: "Deposit",
      },
    }),
  ]);

  const balance = await getBalanceForAccount(userId);
  return {
    transaction_id: transactionId,
    amount: roundedAmount,
    balance,
  };
}

/**
 * Returns transaction history for an account.
 * @throws AppError 404 if account not found
 */
export async function getTransactions(userId: string): Promise<TransactionView[]> {
  const prisma = getPrisma();

  const account = await prisma.account.findUnique({
    where: { userId },
  });

  if (!account) {
    throw new AppError(404, `Account '${userId}' not found`);
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return entries.map((entry) => ({
    transaction_id: entry.transactionId,
    type: Number(entry.amount) >= 0 ? ("credit" as const) : ("debit" as const),
    amount: Math.abs(Number(entry.amount)),
    counterparty_id: entry.counterpartyId,
    description: entry.description,
    notes: entry.notes,
    created_at: entry.createdAt.toISOString(),
  }));
}

/**
 * Internal helper — computes balance from ledger entries.
 */
async function getBalanceForAccount(userId: string): Promise<number> {
  const prisma = getPrisma();
  const result = await prisma.ledgerEntry.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  return Number(result._sum.amount ?? 0);
}
