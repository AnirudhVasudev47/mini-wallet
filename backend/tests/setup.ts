/**
 * Shared test setup — creates the test database, builds the Express app,
 * and exports helpers used by all test files.
 *
 * Uses globalThis to survive ESM module re-evaluation per test file.
 */
import express, { Request, Response, NextFunction } from "express";
import pg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../src/types.js";

const { Pool } = pg;

// ── Config ────────────────────────────────────────────────────
export const TEST_DB = "mini_wallet_test";
export const ADMIN_URL = "postgresql://localhost:5432/postgres";
export const TEST_URL = `postgresql://localhost:5432/${TEST_DB}`;
export const JWT_SECRET = "test-jwt-secret";

// Use globalThis to survive ESM module re-evaluation per test file
const G = globalThis as any;

export function makeToken(userId: string, userIdSlug: string, email: string): string {
  return jwt.sign({ userId, userIdSlug, email }, JWT_SECRET, { expiresIn: "1h" });
}

async function _doSetup(): Promise<void> {
  process.env.JWT_SECRET = JWT_SECRET;

  // If a pool already exists (from a previous module evaluation), reuse it
  if (G.__testPool) {
    return;
  }

  const adminPool = new Pool({ connectionString: ADMIN_URL });
  // Terminate any leftover connections from previous runs
  await adminPool.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${TEST_DB}' AND pid <> pg_backend_pid()
  `);
  await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await adminPool.query(`CREATE DATABASE ${TEST_DB}`);
  await adminPool.end();

  G.__testPool = new Pool({ connectionString: TEST_URL });
  // Suppress "terminating connection" errors from pg_terminate_backend
  G.__testPool.on("error", () => {});

  await G.__testPool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  await G.__testPool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      user_id TEXT UNIQUE NOT NULL REFERENCES accounts(user_id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES accounts(user_id),
      amount NUMERIC(15, 2) NOT NULL,
      counterparty_id TEXT NOT NULL,
      description TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_idempotency
      ON ledger_entries(transaction_id, user_id);

    CREATE INDEX IF NOT EXISTS idx_ledger_user
      ON ledger_entries(user_id, created_at DESC);

    INSERT INTO accounts (user_id, name)
    VALUES ('SYSTEM', 'System')
    ON CONFLICT (user_id) DO NOTHING;
  `);

  // ── Middleware ───────────────────────────────────────────────
  function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    try {
      req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET) as any;
      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  }

  function requireOwnership(req: Request, res: Response, next: NextFunction): void {
    const id = req.params.id as string;
    if (!req.user || (req.user as any).userIdSlug !== id) {
      res.status(403).json({ error: "You can only access your own account" });
      return;
    }
    next();
  }

  // ── Build Express app ───────────────────────────────────────
  G.__testApp = express();
  G.__testApp.use(express.json());

  async function getBalance(userId: string): Promise<number> {
    const result = await G.__testPool.query(
      "SELECT COALESCE(SUM(amount), 0) as balance FROM ledger_entries WHERE user_id = $1",
      [userId],
    );
    return parseFloat(result.rows[0].balance);
  }

  G.__testApp.post("/api/v1/auth/register", async (req: Request, res: Response) => {
    const { email, password, user_id, name } = req.body;
    if (!email || !password || !user_id || !name) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }
    const errors: string[] = [];
    if (password.length < 8) errors.push("at least 8 characters");
    if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
    if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
    if (!/[0-9]/.test(password)) errors.push("one number");
    if (!/[^a-zA-Z0-9]/.test(password)) errors.push("one special character");
    if (errors.length > 0) {
      res.status(400).json({ error: `Password must contain: ${errors.join(", ")}` });
      return;
    }
    const existingEmail = await G.__testPool.query("SELECT 1 FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existingEmail.rows.length > 0) {
      res.status(409).json({ error: "Email is already registered" });
      return;
    }
    const existingUserId = await G.__testPool.query("SELECT 1 FROM accounts WHERE user_id = $1", [user_id]);
    if (existingUserId.rows.length > 0) {
      res.status(409).json({ error: `User ID '${user_id}' is already taken` });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const client = await G.__testPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO accounts (user_id, name) VALUES ($1, $2)", [user_id, name]);
      const userResult = await client.query(
        "INSERT INTO users (email, password_hash, user_id) VALUES ($1, $2, $3) RETURNING id, email, user_id",
        [email.toLowerCase(), passwordHash, user_id],
      );
      await client.query("COMMIT");
      const user = userResult.rows[0];
      const token = makeToken(user.id, user.user_id, user.email);
      res.status(201).json({ token, user: { id: user.id, email: user.email, user_id: user.user_id, name } });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  G.__testApp.post("/api/v1/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const result = await G.__testPool.query(
      "SELECT u.id, u.email, u.password_hash, u.user_id, a.name FROM users u JOIN accounts a ON a.user_id = u.user_id WHERE u.email = $1",
      [email.toLowerCase()],
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = makeToken(user.id, user.user_id, user.email);
    res.json({ token, user: { id: user.id, email: user.email, user_id: user.user_id, name: user.name } });
  });

  G.__testApp.get("/api/v1/auth/me", requireAuth, async (req: Request, res: Response) => {
    const payload = req.user as any;
    const result = await G.__testPool.query(
      "SELECT u.id, u.email, u.user_id, a.name FROM users u JOIN accounts a ON a.user_id = u.user_id WHERE u.id = $1",
      [payload.userId],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(result.rows[0]);
  });

  G.__testApp.get("/api/v1/accounts", requireAuth, async (_req: Request, res: Response) => {
    const result = await G.__testPool.query(`
      SELECT a.id, a.user_id, a.name, a.created_at,
             COALESCE(SUM(l.amount), 0)::NUMERIC(15,2) AS balance
      FROM accounts a
      LEFT JOIN ledger_entries l ON l.user_id = a.user_id
      WHERE a.user_id != 'SYSTEM'
      GROUP BY a.id, a.user_id, a.name, a.created_at
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows.map((r: any) => ({ ...r, balance: parseFloat(r.balance) })));
  });

  G.__testApp.get("/api/v1/accounts/:id/balance", requireAuth, requireOwnership, async (req: Request, res: Response) => {
    const balance = await getBalance(req.params.id as string);
    res.json({ user_id: req.params.id, balance });
  });

  G.__testApp.post("/api/v1/accounts/:id/deposit", requireAuth, requireOwnership, async (req: Request, res: Response) => {
    const { amount } = req.body;
    const userId = req.params.id as string;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Deposit amount must be positive" });
      return;
    }
    const txId = crypto.randomUUID();
    const rounded = Math.round(amount * 100) / 100;
    const client = await G.__testPool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO ledger_entries (transaction_id, user_id, amount, counterparty_id, description) VALUES ($1, $2, $3, $4, $5)",
        [txId, userId, rounded, "SYSTEM", "Deposit"],
      );
      await client.query(
        "INSERT INTO ledger_entries (transaction_id, user_id, amount, counterparty_id, description) VALUES ($1, $2, $3, $4, $5)",
        [txId, "SYSTEM", -rounded, userId, "Deposit"],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    const balance = await getBalance(userId);
    res.status(201).json({ transaction_id: txId, amount: rounded, balance });
  });

  G.__testApp.get("/api/v1/accounts/:id/transactions", requireAuth, requireOwnership, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await G.__testPool.query(
      `SELECT transaction_id, amount, counterparty_id, description, notes, created_at
       FROM ledger_entries WHERE user_id = $1
       ORDER BY created_at DESC, id DESC`,
      [id],
    );
    res.json(result.rows.map((e: any) => ({
      transaction_id: e.transaction_id,
      type: parseFloat(e.amount) >= 0 ? "credit" : "debit",
      amount: Math.abs(parseFloat(e.amount)),
      counterparty_id: e.counterparty_id,
      description: e.description,
      notes: e.notes,
      created_at: e.created_at,
    })));
  });

  G.__testApp.post("/api/v1/transfers", requireAuth, async (req: Request, res: Response) => {
    const { transaction_id, to_user, amount, notes } = req.body;
    const from_user = (req.user as any).userIdSlug;
    if (!transaction_id || !to_user || amount === undefined) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }
    if (amount <= 0) {
      res.status(400).json({ error: "Transfer amount must be positive" });
      return;
    }
    if (from_user === to_user) {
      res.status(400).json({ error: "Cannot transfer to the same account" });
      return;
    }
    const existing = await G.__testPool.query("SELECT created_at FROM ledger_entries WHERE transaction_id = $1 LIMIT 1", [transaction_id]);
    if (existing.rows.length > 0) {
      res.status(200).json({
        transaction_id, from_user, to_user,
        amount: Math.round(amount * 100) / 100,
        timestamp: existing.rows[0].created_at,
        status: "duplicate",
      });
      return;
    }
    const toCheck = await G.__testPool.query("SELECT 1 FROM accounts WHERE user_id = $1", [to_user]);
    if (toCheck.rows.length === 0) {
      res.status(404).json({ error: `Account '${to_user}' not found` });
      return;
    }
    const rounded = Math.round(amount * 100) / 100;
    const client = await G.__testPool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const balResult = await client.query(
        "SELECT COALESCE(SUM(amount), 0) as balance FROM ledger_entries WHERE user_id = $1",
        [from_user],
      );
      const currentBal = parseFloat(balResult.rows[0].balance);
      if (currentBal < rounded) {
        throw new AppError(400, `Insufficient funds. Available: ${currentBal}, requested: ${rounded}`);
      }
      await client.query(
        "INSERT INTO ledger_entries (transaction_id, user_id, amount, counterparty_id, description, notes) VALUES ($1, $2, $3, $4, $5, $6)",
        [transaction_id, from_user, -rounded, to_user, `Transfer to ${to_user}`, notes ?? null],
      );
      await client.query(
        "INSERT INTO ledger_entries (transaction_id, user_id, amount, counterparty_id, description, notes) VALUES ($1, $2, $3, $4, $5, $6)",
        [transaction_id, to_user, rounded, from_user, `Transfer from ${from_user}`, notes ?? null],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    } finally {
      client.release();
    }
    const created = await G.__testPool.query("SELECT created_at FROM ledger_entries WHERE transaction_id = $1 LIMIT 1", [transaction_id]);
    res.status(201).json({
      transaction_id, from_user, to_user,
      amount: rounded,
      timestamp: created.rows[0].created_at,
      status: "completed",
    });
  });
}

// ── Public API ────────────────────────────────────────────────
export function setup(): Promise<void> {
  if (!G.__setupPromise) {
    G.__setupPromise = _doSetup();
  }
  return G.__setupPromise;
}

export function getApp(): express.Express {
  if (!G.__testApp) throw new Error("Call setup() first");
  return G.__testApp;
}

export function getPool(): pg.Pool {
  if (!G.__testPool) throw new Error("Call setup() first");
  return G.__testPool;
}
