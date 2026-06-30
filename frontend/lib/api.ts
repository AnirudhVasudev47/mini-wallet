const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── Types ─────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  user_id: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface BalanceResponse {
  user_id: string;
  balance: number;
}

export interface Transaction {
  transaction_id: string;
  type: "credit" | "debit";
  amount: number;
  counterparty_id: string;
  description: string | null;
  notes: string | null;
  created_at: string;
}

export interface TransferResult {
  transaction_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  timestamp: string;
  status: "completed" | "duplicate";
}

interface ApiError {
  error: string;
}

// ── Helpers ───────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mini_wallet_token");
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as ApiError).error ?? `Request failed: ${res.status}`);
  }

  return data as T;
}

// ── Auth API ──────────────────────────────────────────────────

export function loginApi(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function registerApi(
  email: string,
  password: string,
  userId: string,
  name: string,
): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      user_id: userId,
      name,
    }),
  });
}

export function getMe(token: string): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

// ── Account API ───────────────────────────────────────────────

export function getAccounts(): Promise<Account[]> {
  return request<Account[]>("/accounts");
}

export function getBalance(userId: string): Promise<BalanceResponse> {
  return request<BalanceResponse>(`/accounts/${userId}/balance`);
}

export function getTransactions(
  userId: string,
): Promise<Transaction[]> {
  return request<Transaction[]>(`/accounts/${userId}/transactions`);
}

export function transfer(
  transactionId: string,
  toUser: string,
  amount: number,
  notes?: string,
): Promise<TransferResult> {
  return request<TransferResult>("/transfers", {
    method: "POST",
    body: JSON.stringify({
      transaction_id: transactionId,
      to_user: toUser,
      amount,
      ...(notes ? { notes } : {}),
    }),
  });
}

export function depositFunds(
  userId: string,
  amount: number,
): Promise<{ transaction_id: string; amount: number; balance: number }> {
  return request(`/accounts/${userId}/deposit`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}
