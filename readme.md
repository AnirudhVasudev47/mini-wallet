# Mini Wallet — Ledger-based Transaction System

A minimal full-stack financial system with account management, money transfers, transaction tracking, and balance visibility.

## Tech Stack

| Layer    | Technology                           |
|----------|--------------------------------------|
| Backend  | Node.js, Express.js, TypeScript      |
| Database | PostgreSQL (via `pg`)                |
| Frontend | Next.js, React, shadcn/ui, Tailwind |

## Getting Started

### Prerequisites

- **Node.js** ≥ 18 (for `crypto.randomUUID()`)
- **npm** ≥ 9
- **PostgreSQL** ≥ 14

### Database Setup

**Option A: Docker (recommended)**
```bash
docker compose up -d    # starts PostgreSQL on port 5432
```

**Option B: Local PostgreSQL**
```bash
createdb mini_wallet    # schema is auto-created on first run
```

The backend connects to `postgresql://localhost:5432/mini_wallet` by default. Override with the `DATABASE_URL` environment variable.

### Backend Setup

```bash
cd backend
npm install
npm run dev      # starts on http://localhost:8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev      # starts on http://localhost:3000
```

> **Note:** The frontend expects the backend to be running on `http://localhost:8000`. To change this, set the `NEXT_PUBLIC_API_URL` environment variable.

---

## API Documentation

Base URL: `http://localhost:8000/api/v1`

### Accounts

#### `POST /accounts`

Create a new account.

**Request:**
```json
{ "account_id": "alice", "name": "Alice Johnson" }
```

**Response (201):**
```json
{ "account_id": "alice", "name": "Alice Johnson", "created_at": "2026-06-29 12:00:00" }
```

**Errors:** `409` if account already exists, `400` if fields are missing.

---

#### `GET /accounts`

List all accounts with their computed balances.

**Response (200):**
```json
[
  { "account_id": "alice", "name": "Alice Johnson", "balance": 300.00, "created_at": "..." },
  { "account_id": "bob", "name": "Bob Smith", "balance": 200.00, "created_at": "..." }
]
```

---

#### `GET /accounts/:id/balance`

Get balance for a specific account.

**Response (200):**
```json
{ "account_id": "alice", "balance": 300.00 }
```

**Errors:** `404` if account not found.

---

#### `POST /accounts/:id/deposit`

Deposit funds into an account (creates a credit ledger entry from SYSTEM).

**Request:**
```json
{ "amount": 500.00 }
```

**Response (201):**
```json
{ "transaction_id": "uuid", "amount": 500.00, "balance": 500.00 }
```

---

#### `GET /accounts/:id/transactions`

Get transaction history for an account (most recent first).

**Response (200):**
```json
[
  {
    "transaction_id": "uuid",
    "type": "debit",
    "amount": 200.00,
    "counterparty_id": "bob",
    "description": "Transfer to bob",
    "created_at": "2026-06-29 12:05:00"
  }
]
```

---

### Transfers

#### `POST /transfers`

Transfer money between accounts. **Idempotent** — re-submitting the same `transaction_id` returns the existing result without re-processing.

**Request:**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "from_account": "alice",
  "to_account": "bob",
  "amount": 200.00
}
```

**Response (201):**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "from_account": "alice",
  "to_account": "bob",
  "amount": 200.00,
  "timestamp": "2026-06-29 12:05:00",
  "status": "completed"
}
```

**Duplicate Response (200):**
```json
{ "...same fields...", "status": "duplicate" }
```

**Errors:**
- `400` — Insufficient funds, negative amount, or self-transfer
- `404` — Source or destination account not found

---

## Design Decisions

### 1. Derived Balances (No Stored Balance Column)

Balance is always computed as `SUM(amount)` from ledger entries. This eliminates the entire class of bugs where a stored balance diverges from transaction history. Trade-off: slightly slower balance queries, mitigated by an index on `account_id`.

### 2. Idempotency via Database Constraints

The `UNIQUE(transaction_id, account_id)` index makes it impossible to insert duplicate ledger entries at the database level. The service layer catches constraint violations and returns the existing result — safe to retry after network failures.

### 3. PostgreSQL SERIALIZABLE Isolation for Atomicity

Transfers use `BEGIN ISOLATION LEVEL SERIALIZABLE` to ensure the balance check + debit + credit sequence is fully atomic. PostgreSQL's MVCC guarantees that concurrent transfers from the same account are properly serialized — if two transfers race, one will fail with a serialization error.

### 4. Client-Generated Transaction IDs

The frontend generates a UUID before each transfer. If the request fails after server-side processing, the user can safely retry — the server recognizes the duplicate and returns the existing result (idempotency).

### 5. Double-Entry Ledger Model

Every transfer creates two ledger entries: a debit for the sender and a credit for the receiver. This ensures the books always balance — the sum of all ledger entries across all accounts is always zero.

### 6. NUMERIC(15,2) for Amounts

PostgreSQL `NUMERIC` type stores exact decimal values — no floating-point precision issues. Amounts are stored with 2 decimal places.

---

## Trade-offs

| Decision | Benefit | Cost |
|----------|---------|------|
| PostgreSQL | Production-grade, ACID, real concurrency | Requires a running PG instance |
| Derived balances | Impossible to desync | Slower queries for high-volume accounts |
| SERIALIZABLE isolation | Strongest correctness guarantee | Slight overhead vs READ COMMITTED |
| No authentication | Simpler for exercise scope | Not production-ready |
| Docker Compose included | One-command database setup | Requires Docker (or local PG) |

---

## Running Tests

```bash
cd backend
npm test
```

Tests cover:
- Account creation (success + duplicate + missing fields)
- Balance retrieval (existing + non-existent accounts)
- Deposits (success + negative amount + non-existent account)
- Transfers (success + idempotency + insufficient funds + self-transfer + invalid accounts)
- Transaction history retrieval
