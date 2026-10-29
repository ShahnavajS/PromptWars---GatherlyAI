# Gatherly AI

> **Plan smarter. Spend wisely. Bring everyone together.**

Gatherly AI is an event planning and coordination platform designed from an India-first perspective with an internationally extensible architecture. It enables individuals, couples, and community coordinators to transform event concepts into organized, editable, and mathematically deterministic workspaces.

---

## 🌟 Implemented Capabilities (Phase 2 Vertical Slice)

- **Event Creation Flow:**
  - Create Weddings, Birthdays, Community Gatherings, and Family Celebrations.
  - Multi-field input validation (Zod) on both client and server: event title, date range, location, guest headcounts, and total budget in INR.
  - Default timezone support for `Asia/Kolkata`.
- **Deterministic Financial Engine:**
  - 100% integer minor-unit (paise) math: eliminates JavaScript floating-point rounding errors.
  - Indian numbering system formatting: native `₹`, Lakhs, and Crores grouping (e.g. `₹15,00,000` / `₹15 Lakh`).
  - Strict separation of planned ceiling, category allocations, contingency reserve (10%), and remaining balances.
  - Over-budget detection: automatically surfaces deficit alerts with exact amounts when allocations exceed the ceiling.
- **Deterministic Initial Seeding:**
  - Generates event-specific budget categories (Catering & Dining, Venue & Staging, Decor, Photography, Entertainment) and starter preparation tasks within an atomic SQLite transaction.
  - Category allocations guaranteed to sum to 100% of the total budget without rounding drift.
- **Event Command Center Dashboard (`/events/[id]`):**
  - Live summary: countdown days remaining, guest counts, location, and planned budget cap.
  - Interactive budget category editor: inline editing of any category allocation with real-time recalculated totals and server-side persistence.
  - Interactive task checklist: toggle tasks between `TODO` and `DONE` with instant database persistence.
  - Next recommended action card tailored to the event's progress.
- **Robust Database Layer:**
  - SQLite with `better-sqlite3` and `drizzle-orm`.
  - Enforced foreign keys (`PRAGMA foreign_keys = ON;`) with cascading deletes.
  - Versioned migrations in `src/lib/db/migrations/`.
- **Comprehensive Automated Verification:**
  - Unit tests for budget math, Indian currency formatting, and deterministic seeding.
  - Database integration tests for transactions, user isolation, and cascade deletions.
  - API integration tests for validation failures, negative numbers, and 404 responses.

---

## 🚫 Explicitly Unimplemented in Phase 2 (Deferred to Subsequent Phases)

- **Google Gemini GenAI Integration:** Natural language plan generation, AI prompts, and conversational intake belong to **Phase 3**.
- **Change-Impact Engine:** Relational ripple-effect intelligence for guest count/date shifts belongs to **Phase 4**.
- **Vendor Quotation Ingestion & Comparison:** Multi-quote comparison and document OCR belong to **Phase 5**.
- **Multi-User Role-Based Authentication:** Multi-tenant session management is deferred; current demo runs in local single-user mode.
- **Direct Financial Payments:** No live UPI/banking transactions (Gatherly tracks financial data without moving real funds).

---

## 🛠️ Prerequisites & Local Setup

### Prerequisites
- **Node.js:** `v24.x` or `v22.x`
- **NPM:** `v11.x` or `v10.x`
- **Git**

### Installation
```bash
# Clone and enter the repository
cd "c:\Users\sanus\Desktop\Event Mangment AI"

# Install dependencies
npm install
```

### Environment Configuration
The application uses sensible defaults out of the box. Optionally create a `.env.local` file:
```env
# Optional: defaults to ./data/gatherly.db
DATABASE_URL=./data/gatherly.db
```

### Database Initialization & Migrations
```bash
# Generate versioned migrations
npm run db:generate

# Push schema directly (if needed)
npm run db:push
```
*Note: SQLite database tables are also automatically initialized on first application connection.*

---

## 🚀 Available Scripts

| Script | Purpose |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server at `http://localhost:3000` |
| `npm run test` | Runs the Vitest automated test suite |
| `npm run test:watch` | Runs Vitest in interactive watch mode |
| `npm run type-check` | Runs TypeScript type checker (`tsc --noEmit`) in strict mode |
| `npm run lint` | Runs ESLint with Next.js Core Web Vitals rules |
| `npm run build` | Produces an optimized production build |
| `npm start` | Starts the production server |
| `npm run verify` | Runs all checks: `type-check && lint && test && build` |

---

## 🧪 Test Coverage Summary

- **Unit Tests:**
  - `tests/unit/budget.test.ts`: 16 tests verifying integer paise arithmetic, zero drift, negative rejection, overflow checks, and over-budget deficit detection.
  - `tests/unit/formatting.test.ts`: 7 tests verifying Indian currency formatting (`₹`, Lakhs, Crores) and date formatting (`Asia/Kolkata`).
  - `tests/unit/seeding.test.ts`: 4 tests verifying category and task generation without 1-paisa drift.
- **Integration Tests:**
  - `tests/integration/events.test.ts`: 6 tests verifying atomic transactions, foreign-key cascades, category allocation updates, and user isolation.
  - `tests/integration/api.test.ts`: 8 tests verifying REST API route handlers, input validation schemas, 400 bad requests, and 404 responses.
- **Total Passing Tests:** **41 / 41 passing (100%)**.

---

## 📚 Project Documentation

Detailed architecture specifications are located in [`docs/`](./docs/):
- [`docs/PRODUCT_SPEC.md`](./docs/PRODUCT_SPEC.md) — Product specification, personas, use cases, and non-goals.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — System architecture, module structure, and request lifecycles.
- [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) — Entity relationships, table schemas, and financial invariants.
- [`docs/SECURITY_AND_PRIVACY.md`](./docs/SECURITY_AND_PRIVACY.md) — Threat model, IDOR protection, and prompt injection defense.
- [`docs/EVALUATION_RUBRIC.md`](./docs/EVALUATION_RUBRIC.md) — 14 measurable quality standards.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — 6-phase engineering execution plan.

---

## ⚠️ Known Limitations (Phase 2)

1. **Authentication:** The app runs with a default local session user (`usr_demo`). Production multi-user authentication is scheduled for later phases.
2. **Database Engine:** Uses SQLite via `better-sqlite3` for local development and demonstration. Production deployments may configure PostgreSQL via Drizzle.
