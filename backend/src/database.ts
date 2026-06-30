import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

/**
 * Returns the Prisma Client singleton.
 * In production, a single instance is reused.
 * In development with hot-reload, we store it on globalThis to avoid connection leaks.
 */
export function getPrisma(): PrismaClient {
  if (prisma) return prisma;

  // Avoid creating multiple clients during hot-reload in dev
  const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

  if (globalForPrisma.__prisma) {
    prisma = globalForPrisma.__prisma;
    return prisma;
  }

  prisma = new PrismaClient();
  globalForPrisma.__prisma = prisma;
  return prisma;
}

/**
 * Seeds the SYSTEM account used for deposits.
 * Safe to call multiple times — uses upsert.
 */
export async function seedSystemAccount(): Promise<void> {
  const client = getPrisma();
  await client.account.upsert({
    where: { userId: "SYSTEM" },
    update: {},
    create: { userId: "SYSTEM", name: "System" },
  });
}

/**
 * Disconnects the Prisma Client. Used in tests and graceful shutdown.
 */
export async function disconnect(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

// ── Legacy exports kept for backward-compatibility with tests ──

// Re-export for tests that still use raw pg
import pg from "pg";
const { Pool } = pg;

let pool: pg.Pool;

/**
 * @deprecated Use getPrisma() instead. Kept only for test setup.ts which uses raw SQL.
 */
export function getPool(): pg.Pool {
  if (pool) return pool;

  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://localhost:5432/mini_wallet";

  pool = new Pool({ connectionString });
  return pool;
}

/**
 * @deprecated Use disconnect() instead. Kept only for test setup.ts.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined as unknown as pg.Pool;
  }
}
