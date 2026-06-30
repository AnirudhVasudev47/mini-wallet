"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAccounts,
  getBalance,
  getTransactions,
  type Account,
  type BalanceResponse,
  type Transaction,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface WalletState {
  // Account list (all accounts — for transfer recipient selection)
  accounts: Account[];
  accountsLoading: boolean;

  // Current user's user_id
  userId: string | null;

  // Balance
  balance: BalanceResponse | null;
  balanceLoading: boolean;

  // Transactions
  transactions: Transaction[];
  transactionsLoading: boolean;

  // Error
  error: string | null;

  // Refresh helpers
  refreshAccounts: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export function useWallet(): WalletState {
  const { user } = useAuth();
  const userId = user?.user_id ?? null;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch accounts ────────────────────────────────────────
  const refreshAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      setError(null);
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  // ── Fetch balance ─────────────────────────────────────────
  const refreshBalance = useCallback(async () => {
    if (!userId) return;
    try {
      setBalanceLoading(true);
      const data = await getBalance(userId);
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load balance");
    } finally {
      setBalanceLoading(false);
    }
  }, [userId]);

  // ── Fetch transactions ────────────────────────────────────
  const refreshTransactions = useCallback(async () => {
    if (!userId) return;
    try {
      setTransactionsLoading(true);
      const data = await getTransactions(userId);
      setTransactions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load transactions",
      );
    } finally {
      setTransactionsLoading(false);
    }
  }, [userId]);

  // ── Refresh everything ────────────────────────────────────
  const refreshAll = useCallback(async () => {
    await refreshAccounts();
    if (userId) {
      await Promise.all([refreshBalance(), refreshTransactions()]);
    }
  }, [refreshAccounts, refreshBalance, refreshTransactions, userId]);

  // ── Load data on mount / when userId changes ──────────────
  useEffect(() => {
    if (userId) {
      refreshAccounts();
      refreshBalance();
      refreshTransactions();
    }
  }, [userId, refreshAccounts, refreshBalance, refreshTransactions]);

  return {
    accounts,
    accountsLoading,
    userId,
    balance,
    balanceLoading,
    transactions,
    transactionsLoading,
    error,
    refreshAccounts,
    refreshBalance,
    refreshTransactions,
    refreshAll,
  };
}
