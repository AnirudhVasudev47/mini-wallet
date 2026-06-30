# AI Usage Disclosure

This project was built with the assistance of an AI coding assistant. I designed the architecture, made all key technical decisions, and guided the implementation through iterative prompts while reviewing and validating the generated code at each step.

## How AI Was Used

### Planning & Architecture
- I planned the overall system architecture — a ledger-based double-entry model with derived balances and idempotent transfers.
- I chose the tech stack (Express.js, TypeScript, PostgreSQL, Next.js + shadcn/ui) and directed the AI to align with these choices.
- I designed the authentication model (JWT + bcrypt) and decided on a 1 user = 1 wallet account mapping.

### Code Generation
- **Backend**: The Express.js server, database schema, service layer, routes, and validation middleware were generated with AI assistance based on my architectural decisions. I reviewed all generated code for correctness, particularly the atomic transaction logic and idempotency handling.
- **Frontend**: React components, API client, hooks, and multi-page routing were AI-assisted. I verified the component structure, state management flow, and error handling.
- **Tests**: Integration and unit tests were AI-generated and verified by running them against the actual application.

### Iterative Refinement
- I identified and reported bugs (e.g., `Invalid Date` rendering, `setState` during render warnings, `event.key` null reference in theme provider) and directed fixes.
- I requested specific features like password visibility toggles, full password validation rules, and `.env` configuration.
- I restructured the test suites by splitting monolithic test files into modular, focused files for both backend and frontend.

## What I Reviewed & Validated

1. **Atomicity**: Verified that PostgreSQL `SERIALIZABLE` isolation correctly wraps debit + credit in a single atomic operation.
2. **Idempotency**: Confirmed the `UNIQUE(transaction_id, account_id)` constraint prevents duplicate entries, and tested this with the integration test suite.
3. **Edge Cases**: Ran all integration tests covering insufficient funds, self-transfers, duplicate accounts, non-existent accounts, negative amounts, weak passwords, and unauthorized access.
4. **Type Safety**: Both backend and frontend pass TypeScript strict mode type checking.
5. **Frontend Integration**: Manually tested the full flow: registration → login → deposit → transfer → balance verification → transaction history → logout.
6. **Auth Security**: Verified password hashing with bcrypt, JWT token validation, route protection via middleware, and ownership enforcement on sensitive endpoints.

## Prompts Used

The development was done through a series of directed prompts:

1. **Initial Planning**
   > "This is the exercise given to me. Plan and create a minimal application."

2. **Tech Stack Decisions**
   > "Rewrite the plan with Express.js"
   > "Use TypeScript instead of JavaScript"

3. **Database Migration**
   > "Change the database to PostgreSQL"

4. **Feature Additions**
   > "Add an auth system for account creation. Add .env to both backend and frontend for env variables. Add proper routing system in the frontend with multiple pages."
   > "Add all validation" *(in response to password requirements question)*
   > "Add view password"

5. **Bug Reports & Fixes**
   > *Pasted console errors for theme-provider TypeError and setState warnings, directed fixes*

6. **Test Organization**
   > "Split the files into relevant files" *(backend tests)*
   > "Split this into different files" *(frontend tests)*
   > "Make sure to add test files to a test folder in both apps"
   > "Check all the files and make sure it's proper and exports are all done correctly"

All code was generated across iterative sessions with continuous review, testing, and course-correction at each step.
