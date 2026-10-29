# Gatherly AI

> **Plan smarter. Spend wisely. Bring everyone together.**

Gatherly AI is a GenAI-powered event planning and coordination platform designed from an India-first perspective with an internationally extensible architecture. It enables individuals, couples, and community coordinators to transform event concepts into organized, editable, and AI-assisted workspaces — with every suggestion reviewable before it touches your data.

---

## 🌟 Implemented Capabilities (Phase 3 — GenAI Planning)

### AI Planning (Phase 3 — New)

- **Google Gemini Integration:**
  - Natural language event description → structured, personalized plan via `gemini-2.5-flash`.
  - All AI calls are **server-side only** — `GEMINI_API_KEY` never reaches the browser.
  - Graceful deterministic fallback when the API key is not configured (clearly labelled, never presented as AI output).
  - Prompt injection defense: `<system>` tag sanitization on all user-supplied text.
- **Structured Plan Generation:**
  - AI produces a validated, schema-compliant plan: concept & theme, cultural personalization, budget category proposals, tasks with priorities, agenda blocks, and vendor requirements.
  - Plans are validated with Zod before any data is written.
- **Reviewable Suggestions (AI proposes → user decides):**
  - Generated plans are staged as `PENDING_REVIEW` — nothing changes until the user acts.
  - **Accept All**, **Accept Selected** (individual categories and tasks), or **Reject All**.
  - Idempotent acceptance: re-accepting the same plan never creates duplicate tasks.
  - Accepted plans propagate to the live Budget and Task workspace atomically.
  - Status trail: `PENDING_REVIEW` → `ACCEPTED` / `PARTIALLY_ACCEPTED` / `REJECTED`.
- **Budget Model Fixed (Phase 3 Correction):**
  - Invariant guaranteed: `sum(category allocations) + contingency = totalBudget` exactly.
  - `availableAllocationPaise` is the distributable ceiling (total minus contingency), preventing the original 107%+ utilization false-positive.

### Event Planning Foundation (Phase 2)

- **Event Creation Flow** — Weddings, Birthdays, Community, Celebrations with full Zod validation.
- **Deterministic Financial Engine** — 100% integer paise arithmetic, Indian number formatting (₹, Lakhs, Crores), over-budget detection.
- **Event Command Center Dashboard** — countdown, budget editor, task checklist, next-action card.
- **Robust Database Layer** — SQLite + Drizzle ORM, enforced foreign keys, versioned migrations, cascading deletes.

---

## 🚫 Explicitly Unimplemented (Deferred to Subsequent Phases)

- **Change-Impact Engine:** Relational ripple-effect intelligence for guest count / date shifts → **Phase 4**.
- **Vendor Quotation Ingestion & Comparison:** Multi-quote comparison and document OCR → **Phase 5**.
- **Multi-User Authentication:** Multi-tenant session management deferred; app runs in single `usr_demo` local mode. See [Authentication Limitation](#authentication-limitation).
- **Direct Financial Payments:** No live UPI/banking transactions.

---

## 🛠️ Prerequisites & Local Setup

### Prerequisites
- **Node.js:** `v24.x` or `v22.x`
- **NPM:** `v11.x` or `v10.x`

### Installation
```bash
npm install
```

### Environment Configuration

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

The only value that unlocks AI features is `GEMINI_API_KEY`:

```env
# Required for AI plan generation (get from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your-gemini-api-key-here

# Optional overrides (all have working defaults)
# GEMINI_MODEL=gemini-2.5-flash
# DATABASE_URL=./data/gatherly.db
```

**Without `GEMINI_API_KEY`:** Gatherly falls back to deterministic starter templates. All other functionality (event creation, budgeting, tasks) works normally.

### Running Locally

```bash
npm run dev      # http://localhost:3000
```

The SQLite database (`data/gatherly.db`) is created automatically on first run.

---

## 🚀 Available Scripts

| Script | Purpose |
| :--- | :--- |
| `npm run dev` | Start Next.js dev server at `http://localhost:3000` |
| `npm test` | Run the Vitest automated test suite |
| `npm run test:watch` | Vitest in interactive watch mode |
| `npm run type-check` | TypeScript strict type check (`tsc --noEmit`) |
| `npm run lint` | ESLint with Next.js Core Web Vitals rules |
| `npm run build` | Optimized production build |
| `npm run verify` | Full gate: `type-check && lint && test && build` |
| `npm run db:generate` | Generate versioned Drizzle migration |
| `npm run db:push` | Push schema directly (dev convenience) |

---

## 🧪 Test Coverage Summary (Phase 3)

| File | Tests | What it covers |
| :--- | :---: | :--- |
| `tests/unit/budget.test.ts` | 16 | Integer paise arithmetic, zero drift, over-budget detection |
| `tests/unit/budget-regression.test.ts` | 6 | Phase 3 invariant: categories + contingency = total |
| `tests/unit/formatting.test.ts` | 7 | Indian currency & date formatting |
| `tests/unit/seeding.test.ts` | 4 | Category/task seeding without 1-paisa drift |
| `tests/unit/ai-service.test.ts` | 9 | Gemini client, prompt injection defense, fallback templates |
| `tests/integration/events.test.ts` | 6 | Atomic transactions, FK cascades, user isolation |
| `tests/integration/api.test.ts` | 8 | REST validation, 400/404 responses |
| `tests/integration/plan-review.test.ts` | 6 | Stage → accept/reject/partial, idempotency, auth isolation |
| `tests/integration/ai-api.test.ts` | 7 | AI plan POST/GET, review route, fallback path |
| **Total** | **69** | **All passing** |

---

## 📚 Project Documentation

| Document | Purpose |
| :--- | :--- |
| [`docs/PRODUCT_SPEC.md`](./docs/PRODUCT_SPEC.md) | Product specification, personas, use cases, non-goals |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System architecture, module structure, request lifecycles |
| [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) | Entity relationships, table schemas, financial invariants |
| [`docs/SECURITY_AND_PRIVACY.md`](./docs/SECURITY_AND_PRIVACY.md) | Threat model, IDOR protection, prompt injection defense |
| [`docs/EVALUATION_RUBRIC.md`](./docs/EVALUATION_RUBRIC.md) | 14 measurable quality standards |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | 6-phase engineering execution plan |

---

## ⚠️ Known Limitations

### Authentication Limitation

Gatherly currently runs in **single-user demo mode**. All sessions resolve to `usr_demo` (enforced in `src/lib/auth/session.ts`). There is no sign-up, login, or token-based auth.

- All data is scoped to `user_id = 'usr_demo'` — the database enforces `WHERE event_id = ? AND user_id = ?` on every write, preventing cross-session access even within the demo.
- A `ALLOW_DEMO_AUTH=true` guard prevents the demo session from being used in a production environment without an explicit opt-in.
- **Multi-user auth is scheduled for a later phase** and will require replacing `getCurrentSessionUser()` with a real session provider.

### Database Engine

SQLite via `better-sqlite3` for local development. Production deployments should configure PostgreSQL via Drizzle ORM (configuration change only — no application code changes required).

