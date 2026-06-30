// ── Domain Types ──────────────────────────────────────────────

export interface Account {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface User {
  id: string;
  email: string;
  user_id: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  user_id: string;
  amount: number; // positive = credit, negative = debit
  counterparty_id: string;
  description: string | null;
  notes: string | null;
  created_at: string;
}

export interface TransactionView {
  transaction_id: string;
  type: "credit" | "debit";
  amount: number; // always positive for display
  counterparty_id: string;
  description: string | null;
  notes: string | null;
  created_at: string;
}

// ── Auth Types ────────────────────────────────────────────────

export interface JWTPayload {
  userId: string;
  userIdSlug: string;
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  user_id: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    user_id: string;
    name: string;
  };
}

// ── Request Types ─────────────────────────────────────────────

export interface TransferRequest {
  transaction_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  notes?: string;
}

export interface DepositRequest {
  amount: number;
}

// ── Response Types ────────────────────────────────────────────

export interface BalanceResponse {
  user_id: string;
  balance: number;
}

export interface TransferResponse {
  transaction_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  timestamp: string;
  status: "completed" | "duplicate";
}

// ── Error Types ───────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ── Express Extensions ────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
