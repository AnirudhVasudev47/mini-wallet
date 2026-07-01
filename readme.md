# Mini Wallet — Ledger-based Transaction System

A full-stack digital wallet system built with double-entry bookkeeping, JWT authentication, and idempotent money transfers. Users can register, deposit funds, and transfer money between accounts with full transaction history.

## 🌐 Live Demo

**[mini-wallet-frontend-883639585183.asia-south1.run.app](https://mini-wallet-frontend-883639585183.asia-south1.run.app)**

---

## Tech Stack

| Layer     | Technology                                           |
|-----------|------------------------------------------------------|
| Backend   | Node.js, Express 5, TypeScript, Prisma ORM           |
| Database  | PostgreSQL 16 (`NUMERIC(15,2)` for money, `SERIALIZABLE` isolation) |
| Frontend  | Next.js 15, React, shadcn/ui, Tailwind CSS           |
| Auth      | JWT (HS256, 7-day expiry), bcrypt password hashing    |
| Docs      | Swagger / OpenAPI 3.0 (swagger-jsdoc + swagger-ui-express) |
| Hosting   | Google Cloud Run + Cloud SQL                         |

---

## Project Structure

```
mini_wallet/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── index.ts          # App entry point, middleware, Swagger UI mount
│   │   ├── swagger.ts        # OpenAPI spec definition & schemas
│   │   ├── database.ts       # Prisma client singleton, SYSTEM account seeding
│   │   ├── types.ts          # Domain types, request/response interfaces
│   │   ├── routes/           # Route handlers with OpenAPI annotations
│   │   │   ├── auth.ts       # POST /register, POST /login, GET /me
│   │   │   ├── accounts.ts   # GET /, GET /:id/balance, POST /:id/deposit, GET /:id/transactions
│   │   │   └── transfers.ts  # POST /transfers
│   │   ├── middleware/
│   │   │   ├── auth.ts       # JWT verification, ownership check
│   │   │   └── validate.ts   # Request body validation
│   │   └── services/         # Business logic layer
│   │       ├── authService.ts
│   │       ├── accountService.ts
│   │       └── transferService.ts
│   ├── prisma/
│   │   └── schema.prisma     # Database schema (Account, User, LedgerEntry)
│   └── tests/                # Integration tests (Jest + Supertest)
├── frontend/                 # Next.js web application
├── docker-compose.yml        # PostgreSQL local dev setup
└── AI_USAGE.md               # AI-assisted development documentation
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18 (required for `crypto.randomUUID()`)
- **npm** ≥ 9
- **PostgreSQL** ≥ 14 (or Docker)

### 1. Database Setup

**Option A: Docker (recommended)**
```bash
docker compose up -d    # starts PostgreSQL 16 on port 5432
```

**Option B: Local PostgreSQL**
```bash
createdb mini_wallet
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env     # configure DATABASE_URL, JWT_SECRET, PORT
npm install
npx prisma generate      # generate Prisma client
npx prisma db push       # sync schema to database
npm run dev              # starts on http://localhost:8000
```

**Environment Variables:**

| Variable          | Required | Default | Description                        |
|-------------------|----------|---------|------------------------------------|
| `DATABASE_URL`    | Yes      | —       | PostgreSQL connection string       |
| `JWT_SECRET`      | Yes      | —       | Secret key for signing JWTs        |
| `PORT`            | No       | `8000`  | Server port                        |
| `ALLOWED_ORIGINS` | No       | `*`     | Comma-separated CORS origins       |

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev              # starts on http://localhost:3000
```

> The frontend expects the backend at `http://localhost:8000`. Override with `NEXT_PUBLIC_API_URL`.

---

## API Documentation

### Interactive Docs (Swagger UI)

Once the backend is running, visit:

- **Swagger UI:** [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **OpenAPI JSON:** [http://localhost:8000/api/docs.json](http://localhost:8000/api/docs.json)

The Swagger UI supports "Try it out" — you can register, login, copy the JWT token into the Authorize dialog, and test all authenticated endpoints interactively.

### API Endpoints Summary

Base URL: `http://localhost:8000/api/v1`

#### Auth (`/auth`)

| Method | Endpoint         | Auth | Description                              |
|--------|------------------|------|------------------------------------------|
| POST   | `/auth/register` | No   | Create user + wallet account             |
| POST   | `/auth/login`    | No   | Authenticate and receive JWT             |
| GET    | `/auth/me`       | Yes  | Get current user profile                 |

#### Accounts (`/accounts`)

| Method | Endpoint                      | Auth | Description                              |
|--------|-------------------------------|------|------------------------------------------|
| GET    | `/accounts`                   | Yes  | List all accounts with balances          |
| GET    | `/accounts/:id/balance`       | Yes¹ | Get balance for a specific account       |
| POST   | `/accounts/:id/deposit`       | Yes¹ | Deposit funds into account               |
| GET    | `/accounts/:id/transactions`  | Yes¹ | Get transaction history (most recent first) |

#### Transfers (`/transfers`)

| Method | Endpoint     | Auth | Description                                       |
|--------|--------------|------|---------------------------------------------------|
| POST   | `/transfers` | Yes  | Transfer money between accounts (idempotent)      |

> ¹ **Owner-only:** The `:id` parameter must match the authenticated user's `user_id`.

---

## Design Decisions & Assumptions

### 1. Double-Entry Ledger Model

Every financial operation creates **two ledger entries** — a debit for the sender and a credit for the receiver. This ensures the books always balance: the sum of all ledger entries across all accounts equals zero. Deposits create entries between the user and a special `SYSTEM` account.

### 2. Derived Balances (No Stored Balance Column)

Balance is always computed as `SUM(amount)` from the `ledger_entries` table. This eliminates an entire class of bugs where a cached/stored balance diverges from the actual transaction history.

**Trade-off:** Slightly slower balance queries for accounts with many transactions, mitigated by the `idx_ledger_user` index on `(user_id, created_at DESC)`.

### 3. Idempotent Transfers via Database Constraints

The `UNIQUE(transaction_id, user_id)` constraint (`idx_ledger_idempotency`) makes it impossible to create duplicate ledger entries at the database level. If the same `transaction_id` is resubmitted, the service layer returns the existing result with `status: "duplicate"` — making it safe to retry after network failures.

**Assumption:** The client generates a UUID (`transaction_id`) before each transfer request. The frontend does this using `crypto.randomUUID()`.

### 4. SERIALIZABLE Isolation for Transfers

Transfers use PostgreSQL `SERIALIZABLE` isolation level to ensure the balance check → debit → credit sequence is fully atomic. If two concurrent transfers from the same account race, PostgreSQL's SSI (Serializable Snapshot Isolation) will fail one with a serialization error rather than allowing an overdraft.

**Assumption:** The application does not implement automatic retry on serialization failures — the client should retry the request.

### 5. JWT Authentication

- Tokens are signed with HS256 and expire after **7 days**
- Passwords are hashed with bcrypt (10 salt rounds)
- Password policy enforces: 8+ characters, uppercase, lowercase, number, and special character
- No refresh token flow — on expiry, the user must re-login

**Assumption:** This is acceptable for a wallet exercise. A production system would use short-lived access tokens + refresh tokens.

### 6. NUMERIC(15,2) for Monetary Amounts

All amounts are stored as PostgreSQL `NUMERIC(15,2)` — exact decimal representation with no floating-point precision issues. The application layer rounds to 2 decimal places before any database write.

**Assumption:** All amounts are in a single currency (no multi-currency support).

### 7. Account Visibility

The `GET /accounts` endpoint returns all accounts with their balances to any authenticated user. This is intentional — it powers the transfer recipient picker in the frontend.

**Assumption:** In a production system, you would not expose balances of all users. This endpoint would either return only account IDs/names (no balances) or implement a search-based lookup.

### 8. Schema Management

Prisma ORM handles schema definition and database synchronization via `prisma db push` (development) and generated migrations. The schema uses `@@map()` directives to maintain snake_case database naming conventions while using camelCase in TypeScript.

---

## Trade-offs

| Decision                     | Benefit                                       | Cost                                            |
|------------------------------|-----------------------------------------------|--------------------------------------------------|
| Derived balances             | Impossible to desync from transaction history  | Slower balance queries for high-volume accounts  |
| SERIALIZABLE isolation       | Strongest correctness guarantee for transfers  | Higher overhead vs READ COMMITTED; retry on serialization failures |
| Client-generated UUIDs       | Idempotency is trivial to implement            | Requires client cooperation; server cannot generate sequential IDs |
| Double-entry bookkeeping     | Self-auditing ledger, books always balance     | 2× ledger entries per transaction                |
| Prisma ORM                   | Type-safe queries, schema migrations           | Additional abstraction layer over raw SQL        |
| JWT without refresh tokens   | Simpler auth flow, stateless                   | Users must re-login every 7 days                 |
| All accounts visible         | Simple recipient selection UX                  | Not suitable for production with many users      |

---

## Running Tests

### Backend (Integration Tests)

```bash
cd backend
npm test
```

Tests cover:
- **Auth:** Registration (success, duplicate email, duplicate user_id, weak password, invalid email), login (success, wrong password, nonexistent user)
- **Accounts:** Listing accounts, balance retrieval (existing + non-existent)
- **Deposits:** Success, negative amount, non-existent account
- **Transfers:** Success, idempotency (duplicate `transaction_id`), insufficient funds, self-transfer, invalid accounts
- **Transactions:** History retrieval and ordering

### Frontend (Unit Tests)

```bash
cd frontend
npm test
```

Tests cover:
- Password validation rules
- User ID format validation
- API client configuration
- Date formatting utilities

---

## Development

### Useful Commands

```bash
# Backend
cd backend
npm run dev              # Start dev server with hot reload (tsx watch)
npm run typecheck        # Run TypeScript type checking
npm test                 # Run integration tests
npx prisma studio        # Open Prisma's database GUI

# Frontend
cd frontend
npm run dev              # Start Next.js dev server
npm test                 # Run unit tests
npm run build            # Production build
```
