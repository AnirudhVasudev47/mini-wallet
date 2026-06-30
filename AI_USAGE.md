# AI Usage Disclosure

This project was built with the assistance of an AI coding assistant (Antigravity / Claude).

## How AI Was Used

### Code Generation
- **Backend**: The Express.js server, database schema, service layer, routes, and validation middleware were generated with AI assistance. I reviewed all generated code for correctness, particularly the atomic transaction logic and idempotency handling.
- **Frontend**: React components, API client, and custom hooks were AI-assisted. I verified the component structure, state management flow, and error handling.
- **Tests**: Integration tests were AI-generated and verified by running them against the actual API.

### Architecture & Design
- The ledger-based data model (derived balances, double-entry pattern) was discussed and designed collaboratively with AI.
- The database was initially SQLite (`better-sqlite3`) for rapid prototyping, then migrated to PostgreSQL for production-grade concurrency. The migration to `SERIALIZABLE` isolation and `NUMERIC(15,2)` precision was AI-assisted.

## What I Reviewed & Validated

1. **Atomicity**: Verified that `db.transaction()` in `better-sqlite3` correctly wraps debit + credit in a single atomic operation.
2. **Idempotency**: Confirmed the `UNIQUE(transaction_id, account_id)` constraint prevents duplicate entries, and tested this with the integration test suite.
3. **Edge Cases**: Ran all 19 integration tests covering insufficient funds, self-transfers, duplicate accounts, non-existent accounts, and negative amounts.
4. **Type Safety**: Both backend and frontend pass TypeScript strict mode type checking.
5. **Frontend Integration**: Manually tested the full flow: account creation → deposit → transfer → balance verification → transaction history.

## Prompts Used

The primary prompt was:
> "This is the exercise given to me. Plan and create a minimal application."

Followed by iterative refinements:
> "Rewrite the plan with Express.js"
> "Use TypeScript instead of JavaScript"

All code was generated in a single collaborative session with continuous review.
