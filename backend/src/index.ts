import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import { getPrisma, seedSystemAccount, disconnect } from "./database.js";
import { AppError } from "./types.js";
import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/accounts.js";
import transferRoutes from "./routes/transfers.js";

const app = express();

// ── Middleware ─────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ── Routes ────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/accounts", accountRoutes);
app.use("/api/v1/transfers", transferRoutes);

// ── Health check ──────────────────────────────────────────────
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// ── Global error handler ──────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start server ──────────────────────────────────────────────
const PORT = process.env.PORT ?? 8000;

async function start() {
  // Connect Prisma and seed the SYSTEM account
  await getPrisma().$connect();
  await seedSystemAccount();
  console.log("✅ Prisma connected & SYSTEM account seeded");

  app.listen(PORT, () => {
    console.log(`🏦 Mini Wallet API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnect();
  process.exit(0);
});

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export default app;
