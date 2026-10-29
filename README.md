# Gatherly AI

> **Plan smarter. Spend wisely. Bring everyone together.**

Gatherly AI is a GenAI-powered event planning and coordination platform designed from an India-first perspective with an internationally extensible architecture. It enables individuals, couples, and community coordinators to transform event concepts into organized, editable, and AI-assisted workspaces — with every suggestion reviewable before it touches your data.

---

## 🌟 Implemented Capabilities (Phases 1–6 Complete)

### 1. Explainable Change-Impact Intelligence (Flagship Differentiator)
- **Deterministic Relational Impact Engine:**
  - Evaluates consequences of requirement changes (guest count, start/end dates, total budget, city relocation) without guessing or fabricating numbers.
  - Distinguishes **Calculated Changes** (e.g. per-guest catering scaling, milestone deadline shifts) from **Items Requiring Review** (e.g. venue capacity, decor supplier quantities, unscheduled tasks) and **Constraint Violations** (e.g. budget deficits, reversed date ranges, past dates).
- **Two-Stage Preview & Confirm Workflow:**
  - **Stage 1 (Preview):** Computes explainable findings on an immutable snapshot. Database state is never modified.
  - **Stage 2 (Confirm):** Validates optimistic concurrency (`version`), atomically applies primary requirement updates, and applies only explicitly user-checked side-effects in a single SQLite transaction.
  - **Cancellation:** Discards the preview cleanly with zero side-effects.
- **Task Deadline Provenance Guard:**
  - Distinguishes `EVENT_RELATIVE`, `FIXED_DATE`, `USER_SET`, and `UNKNOWN`.
  - Date shifts only adjust tasks with verified event-relative provenance; fixed-date vendor deadlines, completed tasks, and user-locked milestones are never shifted automatically.
- **Audit Provenance & Change History:**
  - `event_activities` table tracks all confirmed requirement changes with actor attribution, previous/new JSON snapshots, and approved side-effect lists.
  - Interactive history timeline on the dashboard with expandable technical snapshots.

### 2. Multi-Day Timeline & Time-Slotted Schedules
- **Day-by-Day Agenda:**
  - Supports multi-day Indian celebrations (e.g. Day 1 Mehendi & Sangeet, Day 2 Haldi, Wedding & Reception).
  - Time-slotted schedule items with ceremony titles, locations, descriptions, and responsible contacts.
  - Automated detection of overlapping time windows and schedule conflicts.

### 3. Vendor Quotation Intelligence & PDF Document Extraction
- **Evidence-Based Quotation Management:**
  - Tracks vendor requirements, itemized quotes, inclusions, exclusions, and payment terms.
  - Two-phase quote approval: confirming a quote locks the commitment without mutating budget allocations until the user explicitly applies it.
  - Safe superseding semantics: only supersedes competing quotes in the same scope when explicitly opted-in (`supersedeOthers: true`).
- **Private Quotation Document Upload & Extraction:**
  - Multipart PDF upload with strict validation: 5 MB limit, authentic PDF magic bytes (`%PDF-`), sanitized filenames, and path traversal defense.
  - Files stored securely in `private_uploads/quotations/<eventId>/` outside the public web root.
  - Dual extraction pipeline: High-precision GenAI extraction via Gemini (`@google/genai`) with graceful fallback to deterministic heuristic text stream parsing when offline.
  - Extracted fields staged in a review modal (`✓ Extracted` vs `— Missing in Document` badges); never committed without explicit user review.
- **Multi-Currency Safety:**
  - Preserves quotation currency (`INR`, `USD`, `EUR`, `GBP`).
  - Nominal raw comparison across different currencies is disabled; currency notice banners highlight differing currencies.
  - Prevents applying foreign-currency quotations to an INR budget category without explicit conversion.

### 4. Cultural Customization & Regional Presets
- **Authentic Regional Presets:**
  - Pre-configured regional wedding catalogs: Gujarati, Punjabi, South Indian, Bengali, Modern/Contemporary, and Community.
  - Captures traditional ceremonies (e.g. Garba, Dandiya, Haldi, Vidai, Baraat, Muhurtham), authentic decor motifs, and entertainment styles.
  - Dietary preferences: Pure Veg, Jain Available, Vegan, Halal, Mixed.
  - Elder accessibility accommodations and wheelchair flags.
  - Custom traditions tag manager: Add, delete, and view custom rituals saved directly to `customTraditionsJson`.
  - Neutral defaults: Weddings default to modern neutral configurations unless the user explicitly chooses regional presets.

### 5. GenAI Event Planning & Intake Engine
- **Google Gemini Integration:**
  - Natural language event description → structured, schema-compliant plan via `gemini-2.5-flash`.
  - Server-side only: `GEMINI_API_KEY` never reaches the browser.
  - Structured Output Schema grounding & resilient pre-normalization: Tolerant of LLM casing or wrapper variations without crashing.
  - Prompt injection defense: `<system>` tag sanitization on all user-supplied text.
  - Graceful deterministic fallback when the API key is not configured (clearly labelled, never presented as AI output).
- **Reviewable Suggestions (AI proposes → user decides):**
  - Generated plans are staged as `PENDING_REVIEW` — nothing changes until the user acts.
  - **Accept All**, **Accept Selected**, or **Reject All** with idempotent task deduplication.
  - Budget model invariant: `sum(category allocations) + contingency = totalBudget` guaranteed down to 0 paise drift.

### 6. Authentication & Session Security
- **HMAC-SHA256 Signed Session Tokens:**
  - Server-verified session tokens stored in HTTP-only cookies or `Authorization: Bearer` header.
  - Protects against tampering: signature mismatch or expired token immediately rejected.
  - All database queries enforce event ownership: `WHERE event_id = ? AND user_id = ?`.
  - Demo user fallback enabled in development/testing; production guard (`ALLOW_DEMO_AUTH=false`) strictly requires authentication.

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

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
# Google Gemini API Key (get from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your-gemini-api-key-here

# Optional model override (default: gemini-2.5-flash)
GEMINI_MODEL=gemini-2.5-flash

# Optional session secret
AUTH_SECRET=your-32-char-session-secret-key-here
```

**Without `GEMINI_API_KEY`:** Gatherly falls back to deterministic starter templates. All other features (event creation, budgeting, tasks, timeline, quotes, change impact) work completely offline.

### Running Locally

```bash
npm run dev      # http://localhost:3000
```

The SQLite database (`data/gatherly.db`) is initialized automatically with versioned migrations on first run.

---

## 🚀 Available Scripts

| Script | Purpose |
| :--- | :--- |
| `npm run dev` | Start Next.js dev server at `http://localhost:3000` |
| `npm test` | Run the Vitest automated test suite |
| `npm run test:watch` | Vitest in interactive watch mode |
| `npm run type-check` | TypeScript strict type check (`tsc --noEmit`) |
| `npm run lint` | ESLint with Next.js Core Web Vitals rules |
| `npm run build` | Optimized Next.js production build |
| `npm run verify` | Full quality gate: `type-check && lint && test && build` |
| `npm run db:generate` | Generate versioned Drizzle migration |
| `npm run db:push` | Push schema directly (dev convenience) |

---

## 🧪 Test Coverage Summary (Phase 7 Final Baseline)

| File | Tests | What it covers |
| :--- | :---: | :--- |
| `tests/unit/document-extraction.test.ts` | 7 | PDF magic bytes (`%PDF-`), 5MB size limit, private storage isolation, heuristic field parsing |
| `tests/unit/auth-isolation.test.ts` | 12 | HMAC-SHA256 session token signing, verification, tampering rejection, cookie/bearer extraction, CSRF origin guard, demo guard |
| `tests/unit/quote-comparison.test.ts` | 3 | Multi-currency quote tracking, currency mismatch defense on budget apply, safe superseding opt-in, idempotency |
| `tests/unit/vendor.test.ts` | 1 | Vendor management, evidence-based quote recording, 2-phase budget approval |
| `tests/unit/schedule.test.ts` | 5 | Multi-day schedule items, time slots, conflict detection, date range bounds |
| `tests/unit/cultural.test.ts` | 4 | Cultural preset catalog, dietary validation, preferences persistence, custom traditions |
| `tests/unit/change-impact.test.ts` | 15 | Deterministic impact engine rules (guest scaling, date shift, budget deficit, venue) |
| `tests/unit/budget.test.ts` | 16 | Integer paise arithmetic, zero drift, over-budget detection |
| `tests/unit/budget-regression.test.ts` | 6 | Financial invariant: categories + contingency = total |
| `tests/unit/formatting.test.ts` | 7 | Indian currency & date formatting (`Asia/Kolkata`) |
| `tests/unit/seeding.test.ts` | 4 | Category/task seeding without 1-paisa drift |
| `tests/unit/ai-service.test.ts` | 9 | Gemini client, prompt injection defense, fallback templates, schema validation |
| `tests/integration/change-impact.test.ts` | 5 | Preview purity, atomic commit, side-effects, concurrency 409, auth isolation |
| `tests/integration/change-impact-api.test.ts` | 6 | Change impact preview/confirm/history REST API routes |
| `tests/integration/events.test.ts` | 6 | Atomic transactions, FK cascades, user isolation |
| `tests/integration/api.test.ts` | 11 | REST validation, 400/404 responses, cross-user 401/404 isolation |
| `tests/integration/plan-review.test.ts` | 6 | Stage → accept/reject/partial, idempotency, auth isolation |
| `tests/integration/ai-api.test.ts` | 7 | AI plan POST/GET, review route, fallback path |
| **Total** | **130** | **All 18 test files passing (100%)** |

---

## 📚 Project Documentation

| Document | Purpose |
| :--- | :--- |
| [`docs/PRODUCT_SPEC.md`](./docs/PRODUCT_SPEC.md) | Product specification, personas, use cases, non-goals |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System architecture, module structure, request lifecycles |
| [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) | Entity relationships, table schemas, financial invariants |
| [`docs/SECURITY_AND_PRIVACY.md`](./docs/SECURITY_AND_PRIVACY.md) | Threat model, IDOR protection, prompt injection defense, signed sessions |
| [`docs/EVALUATION_RUBRIC.md`](./docs/EVALUATION_RUBRIC.md) | 14 measurable quality standards |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | 6-phase engineering execution plan and completion record |

---

## 🔒 Security & Privacy Architecture

- **Server-Verified Session Tokens:** Cryptographically signed tokens (HMAC-SHA256) prevent client identity spoofing.
- **Tenant Isolation:** Every database mutation and query scopes by `eventId` AND `userId`. Unowned records return 404.
- **Isolated File Storage:** Uploaded vendor PDF documents are stored outside the public `public/` directory in `private_uploads/quotations/<eventId>/`, inaccessible via direct URL requests.
- **Strict File Upload Validation:** File magic bytes (`%PDF-`) and size caps (5 MB) are verified on binary buffers before saving to disk.
- **API Key Secrecy:** `GEMINI_API_KEY` is exclusively consumed in server-side Next.js route handlers and is never shipped in client bundles.
- **Prompt Injection Defense:** Injected `<system>` tags in user-supplied event notes are stripped prior to LLM evaluation.
