# End-to-end project review

Status: source review completed 30 October 2026. Findings cite code and verification output. P0 means a release blocker, P1 means the next major fix, and P2 means an improvement after the core is safe and reliable. This is a review, not a claim of an external competition score.

This is the baseline audit before implementation. See STEPS.md and the current README for fixes made afterward.

## Scope

- Setup, data model, API, AI, UI, testing, and deployment.
- Trace a full event creation and planning flow, then review security and accessibility across the same flow.
- Compare observed behavior with the challenge statement and independent research.

## What works end to end

- A user can create an event and get type-based starter budget categories and tasks in one transaction (`src/app/events/new/page.tsx`, `src/app/api/events/route.ts`, `src/lib/services/eventService.ts`).
- AI plan generation has a server-only Gemini call, Zod plan validation, integer-paise normalization, a deterministic fallback when the key is absent, and a staged review workflow (`src/lib/ai`, `src/lib/services/planReviewService.ts`).
- Budget arithmetic is deterministic, and a change-impact preview distinguishes calculations, reviews, and constraints before transactional confirmation (`src/lib/domain/budget.ts`, `src/lib/domain/impact/engine.ts`, `src/lib/services/changeImpactService.ts`).
- Event-scoped schedule, vendor, quote, cultural preference, and history APIs exist. Quotes have separate confirmation and budget-apply actions.
- Existing unit and integration tests exercise services and route handlers, including ownership checks under directly supplied test identities.

## Challenge fit

| Requirement | Current evidence | Assessment |
| --- | --- | --- |
| Weddings | Wedding starter budget/tasks, cultural presets, multi-day schedule, quotes | Strong basic coverage, but unsolicited Gujarati and vegetarian defaults can mis-personalize other weddings. |
| Birthdays | Birthday seed and generic non-wedding AI fallback | Core creation works; the fallback is party-oriented but comparatively shallow. |
| Community events | Community seed with permits and volunteer task; schedule and vendors | Partial: AI fallback is the generic party plan, and operations such as volunteers, access, weather, permits, and funding are not a connected community workflow. |
| Budgets | Integer-paise allocation and contingency, quotes applied to categories | Good planned-budget base; no expenses, paid amounts, or cash-flow ledger despite documentation claims. |
| Timelines | Preparation tasks and a separate day-of schedule with conflict detection | Present; AI agenda blocks are not displayed or adopted, and date handling needs correction. |
| Vendor checklists | Vendor hub, quotes, vendor requirements table | Partial: AI vendor requirements are generated but not shown or saved; no operative checklist workflow. |
| Personalized ideas | AI concept, theme, dietary/accessibility ideas, cultural preferences | Present in plan review; grounding and event-type defaults need refinement. |

## Ranked findings

### P0 — trustworthy identity is missing

`src/app/api/auth/session/route.ts:10-46` accepts `userId`, name, and email from any POST body, signs them, returns the token, and sets a cookie. There is no credential or account verification. An attacker who knows or guesses an owner ID can obtain a valid owner session. The HMAC proves the server signed the token; it does not prove the caller is that owner. `src/lib/auth/session.ts:209-211` also permits unauthenticated demo access in production unless `ALLOW_DEMO_AUTH` is exactly `false`. Event ownership checks are therefore insufficient for a multi-user deployment. **Action:** remove arbitrary ID token issuance, make demo mode an explicit isolated deployment setting, and use a real authentication provider or verified local account flow before claiming private multi-user data.

### P0 — partial AI budget acceptance discards existing allocations

`src/lib/services/planReviewService.ts:159-199` selects some proposed categories, deletes **all** current categories, writes the selected subset, and resets contingency to the full proposed value. If the user accepts two of five categories, the other three disappear and the recorded budget becomes partly unallocated. Existing tests at `tests/integration/plan-review.test.ts` verify the selected count and status but not the post-review budget contents or invariant. Repeated review can also replace user edits. **Action:** define partial acceptance as merging or replacing only named categories; preserve unrelated categories and confirmed quote links; assert post-apply sums and idempotency in a regression test.

### P0 — the main AI route ignores the request session

`src/app/api/ai/plan/route.ts:12,34` calls `getCurrentSessionUser()` without `req`, so signed cookie and bearer identities are never read. With demo auth enabled, real users generate and retrieve plans as `usr_demo`; with demo auth disabled, these endpoints reject even valid sessions. The alternative `/api/events/[id]/plan/generate` passes `req`, but the UI calls `/api/ai/plan` (`src/components/ai/PlanGeneratorView.tsx:46,82`). **Action:** use one plan endpoint with request-bound identity and add real-user route tests.

### P1 — unbounded AI and upload work can exhaust resources

`src/app/api/events/[id]/quotes/extract-document/route.ts:16-25` parses multipart data and copies the entire file to a buffer before `validatePdfBuffer` checks 5 MB (`src/lib/services/quotationExtractionService.ts:44-50`). AI plan generation and extraction have no observed server-side rate or concurrency limit. `docs/SECURITY_AND_PRIVACY.md` claims a token bucket that does not exist in `src/`. **Action:** enforce request size before buffering, bound AI requests per identity/deployment, cap generated output, and make the docs match the implementation. [OWASP upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

### P1 — upload lifecycle and extraction reliability are incomplete

`src/lib/services/quotationExtractionService.ts:399-408` stores each PDF before extraction, but `privateDocumentId` is not persisted in the quote record or used by a retrieval/deletion route. Abandoned or rejected uploads remain on disk; `DEPLOYMENT.md` describes an authenticated document-serving route that is actually only a quote-status PATCH. The fallback parser searches raw PDF bytes for text literals (`:97-127`), which cannot reliably read compressed, scanned, or many ordinary PDFs. The Gemini extraction parses JSON without a field schema (`:310-365`). **Action:** either keep only manual quote entry for the submission or complete a bounded document lifecycle with a real PDF parser, validated extraction output, linkage, and cleanup. Avoid advertising unsupported document retrieval.

### P1 — date semantics and one existing test fail

`src/lib/domain/formatting.ts:118-144` says the countdown uses Asia/Kolkata but resets `Date` objects to the host's local midnight. Its test constructs a future local date and converts it to a UTC ISO date (`tests/unit/formatting.test.ts:47-54`), causing a 9-versus-10-day failure in this run. Event and schedule schemas accept impossible calendar dates because they only match `YYYY-MM-DD`; schedule time checks accept strings such as `99:99` (`src/lib/validation/events.ts`, `src/lib/validation/schedule.ts`). **Action:** use one explicit date-only convention, validate real calendar dates and times, and test around UTC/IST day boundaries and DST-host environments.

### P1 — important AI results never reach the planning workspace

The plan schema and normalization include `agendaBlocks` and `vendorRequirements` (`src/lib/ai/schemas.ts:77-114`, `src/lib/ai/gemini.ts:225-226`), but `PlanGeneratorView.tsx` renders only concept, personalization, categories, and tasks; `planReviewService.ts` applies only categories and tasks. The `vendor_requirements` table has no active service or UI. **Action:** expose reviewable vendor checklist and agenda blocks or stop asking the model to generate them. This directly affects the brief's vendor and timeline requirements and wastes output tokens.

### P1 — accessibility needs functional work

The event-type buttons in `src/app/events/new/page.tsx:145-168` do not expose selected state to assistive technology. The workspace tab buttons at `src/app/events/[id]/page.tsx:299-372` have no tab roles, `aria-selected`, panel relationship, or alternative active-state announcement. Plan checkboxes (`src/components/ai/PlanGeneratorView.tsx:447-513`) and multiple quote-review fields (`src/components/vendor/QuotationExtractionModal.tsx:304-410`) lack programmatic labels. The quotation `role="dialog"` at `:186` has no observed initial focus, focus trap, Escape handling, or focus restoration. Errors and generation status lack clear live-region announcements. **Action:** use native labels/fieldsets and semantic tabs/dialog behavior, then perform keyboard and screen-reader checks against [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Static source evidence does not establish contrast compliance.

### P1 — documentation overstates current security and functionality

`docs/SECURITY_AND_PRIVACY.md` claims a rate limiter, guest PII model, deletion flow, zero-retention configuration, and full audit logging. The source has none of those complete flows. `docs/ARCHITECTURE.md` diagrams routes, auth pages, modules, and PostgreSQL support that are absent. `docs/PRODUCT_SPEC.md` promises expenses, payments, dependencies, and AI-applied vendor requirements not present in current UI/services. `README.md` says runtime versioned migrations run automatically, while `src/lib/db/index.ts` runs hand-maintained DDL and `DEPLOYMENT.md` prescribes `db:push`. **Action:** rewrite submission claims as implemented behavior, clearly separate planned features, and adopt one migration procedure. Accuracy is part of code quality and security review.

### P2 — privacy and model-output handling need tighter boundaries

`src/lib/ai/gemini.ts:78-80` logs the first 200 characters of the generated plan, which may echo private user details. The `<system>` regex in `src/lib/ai/prompts.ts` strips one tag pattern; it is not a general prompt-injection defense. Zod plan validation and explicit user review are useful controls, but Gemini is asked for JSON without a provider response schema; quotation extraction lacks Zod validation. **Action:** stop logging content, describe the actual data sent to Gemini, use bounded provider schema plus application validation, and keep review-before-write. [OWASP GenAI risks](https://genai.owasp.org/initiatives/top-10-for-llm-and-genai/), [Gemini structured output guidance](https://ai.google.dev/gemini-api/docs/structured-output).

### P2 — event-specific defaults and fallback need correction

`src/lib/services/eventService.ts:122-123` assigns Gujarati and pure-vegetarian defaults to every wedding, while `README.md` says wedding defaults are neutral. `src/lib/ai/fallbacks.ts:18` branches only on wedding vs everything else, so a community festival receives the generic party template, including cake/toast assumptions. `src/lib/domain/seeding.ts:185` also falls back to wedding for the extra `CELEBRATION` type. **Action:** keep defaults neutral until chosen; use concise distinct fallbacks for wedding, birthday, and community events.

### P2 — performance and maintainability have avoidable costs

`src/lib/services/eventService.ts:237-256` runs one event query plus three queries per event for the list, then loads all categories and tasks to count them. This is a `3N+1` query pattern. The event dashboard and vendor hub also issue multiple client fetches. The large single-file components `VendorHub.tsx` and `events/[id]/page.tsx` mix network orchestration, forms, and rendering. `src/lib/db/index.ts` duplicates table DDL already represented by Drizzle schema and migrations. **Action:** use grouped counts/sums for the event list; extract UI sections only where it clarifies responsibility; remove the duplicate schema source once migration tests cover a fresh and upgraded database. Measure before adding caching or new infrastructure.

## Verification performed

| Check | Result |
| --- | --- |
| TypeScript `tsc --noEmit` | Passed |
| ESLint | Passed |
| Vitest | **129 passed, 1 failed** across 18 files; countdown test got 9 instead of 10 |
| Next.js production build | Passed with `next build --webpack` using installed Node 24.21.0 |
| Default `npm run verify` / Turbopack build | Could not complete in this shell because the active `node` shim reports no configured NVM version; Turbopack's PostCSS subprocess hit the same shim. This is an environment/toolchain failure, not evidence of a CSS defect. |
| Browser/assistive technology smoke test | Not completed: the sandbox blocked loopback sockets and the in-app browser timed out on the local server. Accessibility findings above are source-based. |

The build and tests did not call live Gemini. No vendor uploads or existing user event data were modified as part of this review.

## LawGuide PromptWars strategy applied

The prior LawGuide AI chat's latest completion emphasized fixing evaluator-observed defects, strict model-output validation, simpler module boundaries, accessible interactive states, a measured resource budget, and an honest final verification record. The same sequence fits Gatherly: close the identity and data-integrity gaps first, validate real end-to-end flows, then document measured efficiency. A perfect external score cannot be inferred from local checks.

## Recommended order for the next implementation phase

1. Establish a secure, explicit authentication/demo model; fix the request-bound AI route and test real-user isolation.
2. Fix partial plan application and date-only logic with regression tests; protect existing quote/category links.
3. Close upload and AI cost/privacy boundaries, or remove the risky PDF path from the submission until it is complete.
4. Make the AI vendor checklist and agenda usable, improve event-type parity, and correct product copy.
5. Complete keyboard, screen-reader, and mobile checks on the full user journey.
6. Simplify the event-list query and schema migration story, update all claims, then run the full verification gate and a browser smoke test in an environment that permits localhost.
