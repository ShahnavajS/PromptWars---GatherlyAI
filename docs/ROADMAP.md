# Gatherly AI — Phased Implementation Roadmap

This roadmap breaks down the development of Gatherly AI into 6 disciplined, testable, and demonstrable phases.

---

## Roadmap Overview

```mermaid
flowchart LR
    P1["Phase 1: Architecture Blueprint"] --> P2["Phase 2: Vertical Slice & Core Store"]
    P2 --> P3["Phase 3: GenAI Intake & Structured Planner"]
    P3 --> P4["Phase 4: Connected Change-Impact Engine"]
    P4 --> P5["Phase 5: Multi-Day Timeline & Vendor Hub"]
    P5 --> P6["Phase 6: Polish, Audit & Production Demo"]
```

---

## Detailed Phase Breakdown

### Phase 1: Product Understanding, Repository Inspection & Blueprint (COMPLETED ✓)
- **Objective:** Establish the product foundation, inspect runtime environment, define technical architecture, data model, security perimeter, and execution roadmap.
- **Scope:** Repository inspection, architectural documents, data schemas, evaluation criteria, threat model, Phase 2 implementation prompt.
- **Deliverables:**
  - `docs/PRODUCT_SPEC.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DATA_MODEL.md`
  - `docs/SECURITY_AND_PRIVACY.md`
  - `docs/EVALUATION_RUBRIC.md`
  - `docs/ROADMAP.md`
  - `README.md` & `.gitignore`
- **Definition of Done:** All architecture documents written, git initialized, clean environment verified, Phase 2 copy-paste prompt prepared.

---

### Phase 2: Project Scaffold & First Functional Vertical Slice (COMPLETED ✓)
- **Objective:** Bootstrap the working project, configure TypeScript, Next.js App Router, Tailwind CSS, Drizzle ORM, SQLite database, and deliver the first end-to-end persistent vertical slice.
- **Scope & Results:**
  - [x] Project initialization with Next.js 16, React 19, TypeScript strict mode, Tailwind CSS.
  - [x] Drizzle ORM configured with SQLite database (`data/gatherly.db`) and versioned SQL migrations (`src/lib/db/migrations/0000_colorful_pyro.sql`).
  - [x] Foreign-key cascade constraints and indexes implemented across `events`, `event_budgets`, `budget_categories`, and `event_tasks`.
  - [x] Deterministic budget domain engine implemented in `src/lib/domain/budget.ts` with integer paise arithmetic and over-budget detection.
  - [x] Indian currency formatting (`formatINR`, `formatCompactINR` in Lakhs/Crores) and date formatting (`Asia/Kolkata`).
  - [x] Deterministic initial seeding for Weddings, Birthdays, and Community events inside atomic transactions.
  - [x] Landing page with active events list, 1-click Gujarati wedding demo seeder, and "+ Plan New Event" navigation.
  - [x] Event creation wizard with client & server-side Zod validation.
  - [x] Event Command Center (`/events/[id]`): live budget metrics, category allocation editor, interactive task toggle checklist, and next recommended actions.
  - [x] Automated test suite: 41 passing tests (unit, integration, and API tests).
  - [x] Complete verification suite passing (`npm run verify`: type-check, lint, test, build).
- **Definition of Done:** 100% verified and demonstrable. All changes persist across reloads.

---

### Phase 3: GenAI Event Planning & Intake Engine (COMPLETED ✓)
- **Objective:** Connect Google Gemini via the official `@google/genai` SDK to enable natural-language event planning with runtime Zod schema validation, reviewable staged suggestions, and safe acceptance into the live workspace.
- **Scope & Results:**
  - [x] `@google/genai` SDK v2.32.0 integrated (`gemini-2.5-flash`).
  - [x] Server-side only AI calls — `GEMINI_API_KEY` never exposed to browser bundle.
  - [x] Prompt injection defense: user-supplied `<system>` tags are stripped before the prompt is sent.
  - [x] Structured Zod schema validation on every AI response before any write occurs.
  - [x] `ai_plan_suggestions` staging table with status trail: `PENDING_REVIEW` → `ACCEPTED` / `PARTIALLY_ACCEPTED` / `REJECTED`.
  - [x] Deterministic starter template fallback: honestly labelled `modelUsed: 'deterministic-starter-template'`, never claimed as AI output.
  - [x] AI Planner tab on event dashboard: generates plan, shows concept / personalization / budget / tasks sections with per-item checkboxes.
  - [x] Accept All / Accept Selected / Reject All — idempotent acceptance (duplicate task prevention).
  - [x] Accepted suggestions propagate to budget categories and task checklist atomically.
  - [x] Budget model invariant fixed: `sum(categories) + contingency = totalBudget` guaranteed.
  - [x] `src/lib/auth/session.ts` documents demo mode, warns in production environments.
  - [x] `.env.example` added with all configurable keys documented.
  - [x] 69 tests passing (9 files: unit AI service, budget regression, formatting, seeding; integration plan-review, AI API, events, API).
  - [x] Complete verification passing (`npm run verify`: type-check, lint, test, build).
- **Definition of Done:** Fully verified. Users can describe an event in natural language, review AI-generated categories and tasks, selectively accept, and see them reflected in their live workspace.

---

### Phase 4: Connected Event Planning & Explainable Change-Impact Engine (COMPLETED ✓)
- **Objective:** Build the flagship product differentiator: relational change-impact detection and explainable intelligence with a two-stage preview & confirm workflow, optimistic concurrency, and audit provenance.
- **Scope & Results:**
  - [x] Deterministic Rule Engine for change impact analysis:
    - Guest count scaling: Scales catering based on established per-guest rate (~₹/guest), flags other categories (Decor, Stationery, Favors) for review without fabricating numbers, raises venue capacity warnings when increase exceeds 20%.
    - Date shifts: Calculates calendar day difference (`diffDays`), shifts incomplete milestone task due dates proportionally with opt-in checkboxes, preserves completed tasks (`DONE`), detects invalid/reversed date ranges, warns on short notice windows.
    - Budget cap modifications: Computes available pool and contingency, identifies category deficits with exact amounts, flags unallocated surpluses without altering commitments.
    - City relocation: Identifies vendor, travel, and logistics re-verification requirements.
  - [x] Two-Stage Preview & Confirm Workflow:
    - Stage 1 (Preview): Computes explainable findings on an immutable snapshot. Database is never mutated.
    - Stage 2 (Confirm): Atomically applies primary requirement updates and user-selected side-effects in a single SQLite transaction.
  - [x] Stale State & Concurrency Protection:
    - Optimistic concurrency control via `version` column on events.
    - Rejects stale preview confirmations with HTTP 409 Conflict if workspace was modified in the interim.
  - [x] Activity Audit Logging & Provenance:
    - `event_activities` table records all confirmed requirement changes with actor attribution, previous/new JSON snapshots, and approved side-effect lists.
    - Interactive history timeline on the dashboard with expandable technical snapshots.
  - [x] UI Dashboard Integration:
    - "Change Impact & History" tab and quick header banner link.
    - Per-item findings cards with opt-in side-effect checkboxes.
  - [x] Automated Test Suite: 95 passing tests across 12 test files (26 new Phase 4 tests).
  - [x] Complete verification passing (`npm run verify`: type-check, lint, test, build).
- **Definition of Done:** 100% verified and demonstrable. Changing event requirements previews consequences without mutating data; user confirmation persists changes atomically with full audit history.

---

### Phase 5: Multi-Day Timeline, Vendor Quotation Analyzer & Cultural Customization (COMPLETED ✓)
- **Objective:** Expand the operational depth with multi-day ceremony scheduling, vendor RFP & quote comparison, and dietary/accessibility management.
- **Scope & Results:**
  - [x] Multi-Day Timeline View: Day 1 (Mehendi & Sangeet), Day 2 (Haldi, Wedding, Reception) with time-slotted schedules.
  - [x] Automated schedule conflict detection across overlapping ceremony windows.
  - [x] Vendor RFP & Quotation Hub: Track vendor requirements, enter itemized quotes with inclusions, exclusions, and payment terms.
  - [x] Side-by-side quote comparison matrix with accessible status badges.
  - [x] Two-phase quote confirmation: Quote acceptance does not mutate budget until explicit user application.
  - [x] Cultural Customization Catalog: Gujarati, Punjabi, South Indian, Bengali, Modern, and Community presets with authentic traditions and dietary rules.
  - [x] Task deadline provenance model: Distinguishes `EVENT_RELATIVE`, `FIXED_DATE`, `USER_SET`, and `UNKNOWN`.
  - [x] 105 tests passing across 15 test files.
  - [x] Complete verification passing (`npm run verify`: type-check, lint, test, build).
- **Definition of Done:** User can schedule multi-day ceremonies, compare vendor quotes, apply confirmed quotes to budget categories with full provenance, and customize cultural preferences.

---

### Phase 6: Quality Audit, Missing-Requirement Closure, Security & Demo Readiness (COMPLETED ✓)
- **Objective:** Final engineering audit of the complete Gatherly AI codebase, closing all missing requirements, hardening security, and polishing for hackathon demonstration.
- **Scope & Results:**
  - [x] **Quotation Document Upload & Extraction Workflow:**
    - Multipart PDF upload with 5MB cap, authentic PDF magic bytes inspection (`%PDF-`), and path traversal defense.
    - File storage isolated outside public web root in `private_uploads/quotations/<eventId>/`.
    - Dual extraction pipeline: Gemini GenAI extraction with deterministic heuristic text parser fallback.
    - Candidate staging modal displaying extracted vs missing fields for explicit user verification before saving.
  - [x] **Multi-Currency Safety & Safe Superseding:**
    - Explicit currency tracking (`INR`, `USD`, `EUR`, `GBP`) with nominal ranking disabled when currencies differ.
    - Budget application blocked on currency mismatch between quote and event budget.
    - Safe superseding semantics: only supersedes competing quotes in the same scope when explicitly requested (`supersedeOthers: true`).
    - Idempotent quote confirmation.
  - [x] **Server-Verified Authentication & Session Isolation:**
    - Cryptographically signed session tokens (HMAC-SHA256) via cookies and Bearer headers.
    - Strict tenant isolation on every API route and database query (`WHERE event_id = ? AND user_id = ?`).
    - Tampered and expired tokens rejected.
    - Demo user fallback enabled in development/testing with honest production guard (`ALLOW_DEMO_AUTH=false`).
  - [x] **Cultural Personalization Improvements:**
    - Neutral defaults (`MODERN` / `MIXED`) for newly created events unless the user explicitly chooses regional presets.
    - Custom traditions tag manager: Add, delete, and view custom rituals persisted to `customTraditionsJson`.
  - [x] **Gemini Schema Grounding & Field Tolerance:**
    - Explicit JSON schema embedded directly in Gemini system prompt.
    - Resilient pre-normalization handling LLM casing or wrapper variations without schema validation crashes.
  - [x] **Automated Test Suite Expansion:**
    - 123 tests passing across 18 test files (18 new Phase 6 tests covering document extraction, session isolation, and quote comparison).
  - [x] **Full Quality Gate Passing:**
    - `npm run verify` (`tsc --noEmit`, `eslint`, `vitest run`, `next build`) passing with zero errors and zero warnings.
- **Definition of Done:** All acceptance criteria satisfied, zero regressions, full documentation updated, application ready for presentation and deployment.
