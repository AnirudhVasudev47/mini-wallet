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

  // Fetch all non-SYSTEM accounts
  const accounts = await prisma.account.findMany({
    where: { userId: { not: "SYSTEM" } },
    orderBy: { createdAt: "desc" },
  });

  // Aggregate balances per user in a single query
  const balances = await prisma.ledgerEntry.groupBy({
    by: ["userId"],
    where: { userId: { not: "SYSTEM" } },
    _sum: { amount: true },
  });

  // Build a lookup map for O(n) merging
  const balanceMap = new Map(
    balances.map((b) => [b.userId, Number(b._sum.amount ?? 0)]),
  );

  return accounts.map((account) => ({
    id: account.id,
    user_id: account.userId,
    name: account.name,
    created_at: account.createdAt.toISOString(),
    balance: balanceMap.get(account.userId) ?? 0,
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
