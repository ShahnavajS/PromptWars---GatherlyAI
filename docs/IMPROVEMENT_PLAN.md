# Gatherly AI: post-evaluation improvement plan

Date: 30 October 2026  
Repository reviewed: `9dc46f5` (`master`)  
Status: implementation pass completed locally; see [release evidence](RELEASE_EVIDENCE.md) for checks and remaining external gates. No new evaluator score is claimed.

The findings and proposed steps below preserve the **pre-implementation baseline**. They describe what was observed before the current changes; the release evidence records the current verified state.

## 1. What the score does and does not tell us

The submitted Gatherly screenshot reports **91.08/100**: Code Quality **86**, Security **96**, Efficiency **80**, Testing **81**, Accessibility **93**, and Problem Statement Alignment **98**. The screenshot provides no criterion explanations, weights, evaluated commit, or performance traces. The deductions below are therefore **hypotheses based on the current repository**, not statements from the Gatherly judge. Ask for Gatherly's detailed analyzer JSON or evaluated commit if available; compare that exact snapshot before attributing a deduction to a specific line.

The detailed **LawGuide AI** report supplied with the request describes a different project. It is useful evidence about the judge's habits: it rewarded thin route handlers, service boundaries, real AI integration, extensive security and integration tests, and clear documentation; it penalized oversized files and weak runtime validation. Its 95.15 score, individual findings, and weights **must not be treated as Gatherly results**. More tests or features by themselves cannot guarantee 100.

## 2. Independent target: what a strong solution to this brief needs

Starting from the challenge statement alone, the smallest complete product is an organizer-owned event brief followed by an editable budget, dated preparation and day-of timeline, vendor checklist, and ideas personalized to **weddings, birthdays, and community events**. AI should propose plans, disclose assumptions, and require review before changing costs or commitments. Deterministic code should own currency math, dates, authorization, and persistence. A finished submission needs a credible full journey for each event type and honest limits for location-specific permits, real vendor prices, PDF extraction, and AI availability.

Gatherly already implements that core: event-specific seeds and offline plans, staged Gemini proposals, budget and task review, schedules, vendor requirements and quotes, preferences, and change-impact previews. [Product specification](PRODUCT_SPEC.md), [README](../README.md), [AI route](../src/app/api/ai/plan/route.ts), and [plan review service](../src/lib/services/planReviewService.ts) show the flow. The remaining work should improve **trust, maintainability, measured speed, and proof** before adding RSVP, payments, ticketing, marketplaces, 3D visuals, or other broad features. Those expansions are outside the stated requirement and would add code, data, and security burden.

## 3. Evidence from the current repository

| Area | Observed evidence | Interpretation |
| --- | --- | --- |
| Structure | Next 16.4.3, React 19, TypeScript, Drizzle, SQLite, Zod, Gemini, Vitest; 91 source/test TS, TSX, or CSS files. Routes, services, domain logic, and components are separated. | Good foundation; the code-quality gap is more likely local complexity and duplicated paths than the top-level layout. |
| File size | `VendorHub.tsx` 774 physical lines, `PlanGeneratorView.tsx` 615, `ChangeImpactView.tsx` 598, `TimelineView.tsx` 558, `vendorService.ts` 560, impact engine 608. | These combine state, fetching, business decisions, and rendering. Refactor by responsibility, not by an arbitrary line limit. |
| Current tests | `vitest run --reporter=dot` passed **138/138 tests in 24 files**, 42.19 seconds on this machine. Vitest reported import work as 82% of tracked duration. | Strong unit/integration base; no browser end-to-end suite or accessibility automation found. `docs/STEPS.md` still says 143. |
| Authentication | Password-backed accounts, hashed revocable tokens, CSRF checks, owner-scoped route handlers, and isolated example account exist. | Preserve these. `src/proxy.ts` performs a database lookup on each protected page request, while services still have implicit `usr_demo` owner defaults. |
| Data/deployment | `src/lib/db/index.ts` runs hand-maintained `CREATE TABLE` and compatibility `ALTER`; Drizzle migrations also exist. The latest commit adds a Vercel `/tmp/gatherly.db` default, while `DEPLOYMENT.md` requires persistent SQLite. Docker uses Node 20; README and deployment guide say Node 24. | **Highest release risk:** a Vercel deployment can accept accounts/events into an ephemeral database. Schema upgrade behavior is weakly proven. |
| Performance | The event list now uses a fixed number of aggregate queries; the homepage sequentially fetches session then events after hydration, and the event workspace fetches its data after hydration. The workspace statically imports all feature panels. | Old `3N+1` list finding is fixed. Current bottlenecks need a production browser and bundle trace before optimization. |
| AI | Gemini uses `application/json` and Zod validation, with a human review step. Several model arrays have no `.max()`, `relativeDeadlineDays` has no range, and generation has no explicit output-token or response-size ceiling. Stored suggestion JSON is parsed without revalidation on read/apply. | Strengthen boundedness and date correctness with small schema and parsing changes. Measure real model behavior; mocks alone do not prove live output quality. |
| Accessibility | Semantic headings, labels, `aria-pressed`, alerts/status, visible focus, reduced-motion CSS, and modal focus handling exist. | Good source-level baseline. There is no recorded NVDA/VoiceOver, keyboard-only, contrast, zoom/reflow, or automated axe run for the current build. |
| CI | No `.github` workflow or browser test configuration is present. | Local green results are not a reproducible submission gate. |

The pre-implementation [review](REVIEW.md) identified unauthenticated demo access, arbitrary identity issuance, loss of budget categories during partial review, an unbound AI session, unsafe upload flow, hidden AI agenda/vendor output, and `3N+1` list queries. Current code and later commits close those specific gaps. Do not reopen them to chase a score. The old review is a **before** snapshot; the table above is the **after** snapshot. Because we do not know the exact evaluated commit, neither snapshot proves why Gatherly received 91.08.

### Before/after lessons for the next submission

| Baseline audit finding | Current state | Lesson to carry forward |
| --- | --- | --- |
| Caller-chosen identity and implicit anonymous demo access | Account-backed login, revocable sessions, owner-scoped APIs, and an isolated opt-in example account | Design guest, example, owner, and other-owner tests before adding private data. Never make a shared demo identity the default. |
| Partial AI review deleted unrelated budget categories | Existing category IDs and linked quotes are preserved; rebalancing has regression tests | Define financial invariants and user approval semantics before implementing acceptance buttons. |
| AI plan route was not request-bound; agenda and vendor proposals were hidden | The route uses the session owner and review can apply agenda and vendor requirements | Test the actual browser-used route and render every generated field that consumes cost. |
| Event list performed `3N+1` queries | List uses a fixed number of grouped queries | Measure queries and payloads before adding more dashboard cards; keep a realistic scale fixture. |
| Upload checked size after buffering and left files on disk | Multipart body is bounded and PDF bytes are processed in memory | Test ordinary and hostile documents through the complete review flow, not only an oversized header. |
| One date test failed; accessibility was largely source-reviewed | Date validation and focus/labels improved; 138 tests now pass | Green unit tests and source inspection still leave browser, screen-reader, timezone, and deployed-host gaps. |
| No durable deployment was proven | A Docker path exists, but the latest Vercel `/tmp` fallback contradicts the persistent-database requirement | Make deployment topology, migration, restart, and backup checks part of the release gate before calling the project production ready. |

## 4. Ranked findings and decisions

### P0 — make deployment durable and upgrades reproducible

**Evidence.** [`getDatabasePath()`](../src/lib/db/index.ts) defaults to `/tmp/gatherly.db` when `VERCEL` is set. [`DEPLOYMENT.md`](../DEPLOYMENT.md) says a persistent disk and one Node process are required. Vercel's own [SQLite guidance](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel) says local SQLite is not supported as durable application storage there. Runtime DDL and six Drizzle migration files are separate schema sources; [`db-upgrade.test.ts`](../tests/integration/db-upgrade.test.ts) checks only a few columns/tables.

**Plan.** Choose one deployable path for this submission: a single long-running container/VM with a mounted persistent volume, or a managed database with an explicit adapter migration. The smallest change for this repository is the **single-instance persistent-volume path**. Require an explicit absolute `DATABASE_URL` in production and reject known ephemeral locations such as serverless `/tmp`; remove the silent Vercel fallback. Align Docker, README, and deployment instructions to one tested Node version. Pick one versioned migration mechanism and migrate existing runtime-created databases without data loss before deleting duplicate DDL. Add a backup/restore rehearsal and a fresh-install plus upgrade-from-prior-schema test. Do not point production at `db:push` as an upgrade procedure.

**Done when.** Production refuses to start with an ephemeral or missing database path; a restart preserves two accounts and their events; a previous schema upgrades with records, sessions, categories, and quotes intact; a restored backup passes the same smoke test; the deployment guide matches the tested host configuration.

### P1 — reduce code complexity at actual seams

**Evidence.** Large panels and vendor/impact services appear in the file-size inventory above. Many route handlers repeat JSON parsing, 401/404/500 mapping, and Zod issue formatting even though [`apiErrorResponse`](../src/lib/api/errors.ts) exists. Several services still default an omitted owner argument to `usr_demo` ([event service](../src/lib/services/eventService.ts), [plan review service](../src/lib/services/planReviewService.ts), [change-impact service](../src/lib/services/changeImpactService.ts)). This is a footgun for the next route author, even though current routes supply session IDs.

**Plan.** Remove implicit owner defaults from production service signatures and update tests to state their fixture owner. Extract the `VendorHub` request/state orchestration from its vendor list, quote form, and requirement list; extract plan review sections from `PlanGeneratorView`; split the impact engine by pure rule families only where tests show independent behavior. Keep route handlers thin and reuse one small response/validation helper for repeated error handling. Avoid a new generic controller framework, service interface per class, or broad dependency-injection layer: those would increase code without solving the observed problem.

**Done when.** Every event-scoped service call requires an explicit owner; route tests cover guest, owner, and other owner; the main feature panels have one clear state owner and separately testable pure logic; route error behavior is consistent; TypeScript, lint, and all existing tests stay green. Review the diff for **net readability**, not just fewer lines per file.

### P1 — cap AI and request work, then validate stored plans

**Evidence.** [`StructuredPlanOutputSchema`](../src/lib/ai/schemas.ts) caps category/task counts but leaves several other arrays unbounded and accepts any integer for `relativeDeadlineDays`. [`gemini.ts`](../src/lib/ai/gemini.ts) sets JSON MIME but no provider response schema, explicit output limit, deadline, or raw-text size check before parsing. Date normalization uses local `Date#setDate` for a date-only value. [`planReviewService.ts`](../src/lib/services/planReviewService.ts) trusts `JSON.parse` of persisted suggestions. Most JSON routes call `req.json()` without a byte limit; the auth and PDF routes are exceptions.

**Plan.** Set realistic `.max()` counts and deadline bounds for every model-generated list; cap generation output tokens and wall time using the installed SDK's supported options; reject overlarge raw responses before `JSON.parse`. Use the provider's structured-output schema where its supported subset allows it, and keep Zod validation after the response; [Gemini explicitly recommends application-side validation](https://ai.google.dev/gemini-api/docs/structured-output). Revalidate versioned stored suggestions before display or application, and fail safely on older/corrupt records. Normalize deadlines with UTC date-only arithmetic. Add one shared bounded JSON-body reader for state-changing routes, with endpoint-specific limits. Retain existing per-user AI/upload limits and review-before-write.

**Done when.** Oversized, malformed, negative-deadline, and stale stored payloads fail predictably without a partial write or a secret-bearing error; unit tests cover UTC/IST boundaries; an actual Gemini canary run produces a reviewable wedding, birthday, and community plan or a clear provider failure; request and output limits are documented and tested.

### P1 — measure and remove avoidable client/server work

**Evidence.** The homepage's [`useEffect`](../src/app/page.tsx) waits for `/api/auth/session`, then `/api/events`. The event page's [`useEffect`](../src/app/events/[id]/page.tsx) fetches details after rendering, while [`src/proxy.ts`](../src/proxy.ts) already verifies the session through SQLite for protected pages. All six workspace panels are statically imported from a client page even though one is shown at a time. Next 16's [production guide](https://nextjs.org/docs/app/guides/production-checklist) recommends smaller client boundaries, and its [authentication guide](https://nextjs.org/docs/app/guides/authentication) cautions against database checks in Proxy because prefetched routes also run through it.

**Plan.** First capture production build route bundles, network waterfall, server timings, and Lighthouse/Core Web Vitals on mobile and desktop. Then server-render the initial event list and event detail with a verified session/owner check close to data access; keep interactive editors as client components. Use Proxy as an early cookie redirect only **after** a secure page/API check is in place, so revocation still works. Lazy-load panels if bundle analysis shows a meaningful route cost. Profile `getEventById` and the vendor hub's three requests before combining endpoints. Do not add caching of private event data or new infrastructure without a measured need.

**Done when.** Guest and revoked-cookie access remains denied; first content is available without waiting for a browser fetch; measured route JavaScript, request count, server p95, and LCP/INP/CLS improve against a recorded baseline. Use [Next's bundle analysis guidance](https://nextjs.org/docs/app/guides/package-bundling) and [web.dev's LCP](https://web.dev/articles/optimize-lcp) and [INP](https://web.dev/articles/optimize-inp) metrics. Set numeric budgets from that baseline rather than inventing an unmeasured target.

### P1 — make testing a release artifact, not a count

**Evidence.** 138 passing Vitest tests exercise domain logic and route handlers. [`vitest.config.mts`](../vitest.config.mts) uses a Node environment and sequential files. There are no browser E2E tests, CI workflow, or recorded real PDF/live Gemini run. The old docs report 143 tests. The upload route has one integration test for an oversized multipart request ([`upload-api.test.ts`](../tests/integration/upload-api.test.ts)); that does not demonstrate ordinary compressed PDFs, malformed multipart bodies, or a complete user confirmation flow.

**Plan.** Add a focused browser suite for: (1) guest denial and sign-in/out, including direct event URL; (2) two-account isolation; (3) create/review/edit for each named event type; (4) quote confirmation and budget effect; and (5) change-impact preview/confirm/stale state. Use disposable DBs, deterministic fixtures, and no real API key in CI. Add real PDF fixtures (text, compressed, scanned or an explicit unsupported result) and test the upload-review-save path. Add boundary/property-style assertions for money, dates, and plan selection using existing Vitest, rather than inflating test count with mirror tests. Add CI for `npm ci`, type-check, lint, tests, migration smoke, build, browser suite, and dependency audit. Keep a separate opt-in live Gemini smoke gate for release with controlled sample data and cost.

**Done when.** A clean checkout runs the same gates automatically; screenshots/traces identify browser failures; CI exercises all three event types and both authentication boundaries; documentation reports the test count generated by the current run. [Playwright's official guidance](https://playwright.dev/docs/intro) supports these user-visible browser journeys and [CI setup](https://playwright.dev/docs/ci).

### P1 — verify the accessibility that source code cannot prove

**Evidence.** The UI has visible focus, labels, `aria-pressed` navigation, live messages, and reduced-motion handling. The quote extraction modal implements a custom focus loop ([`QuotationExtractionModal.tsx`](../src/components/vendor/QuotationExtractionModal.tsx)); the workspace replaces one section with another under button navigation ([`events/[id]/page.tsx`](../src/app/events/[id]/page.tsx)). Neither has a recorded keyboard/screen-reader result for this build. Source review alone cannot establish contrast, reflow, announcements, or focus order.

**Plan.** Run axe in browser tests on sign-in, creation, overview, every workspace section, and the open quote modal; then perform a manual keyboard and NVDA/VoiceOver walkthrough. Check 200%/400% zoom, 320 CSS px reflow, focus not obscured, status announcements, form errors, modal close/return focus, and motion preferences against [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/). Fix observed issues with native controls first. If workspace buttons are treated as tabs, implement the complete tab keyboard/panel relationship; otherwise keep honest button navigation and announce panel changes. Prefer native `<dialog>` if it simplifies the current custom trap without breaking the form. Separately test whether **event accessibility ideas** are useful in community plans; software accessibility and event accessibility are distinct.

**Done when.** No serious automated violations remain in tested states; a keyboard user can complete the full plan/quote journey; a screen-reader user hears loading, validation, selection, and save outcomes; contrast and reflow measurements are recorded. [Playwright notes that automated accessibility checks do not replace manual assessment](https://playwright.dev/docs/accessibility-testing).

### P2 — polish challenge fit after the gates above

**Evidence.** The three required types have distinct starter paths in [`seeding.ts`](../src/lib/domain/seeding.ts) and [`fallbacks.ts`](../src/lib/ai/fallbacks.ts); the score already gives alignment 98. The product remains India-first (`INR`, `Asia/Kolkata`) and does not claim vendor prices, payments, or RSVP handling. The AI vendor checklist and agenda now reach review, unlike the older audit. Current date/timezone and community operational behavior need real user-journey proof.

**Plan.** Walk one realistic wedding, birthday, and community scenario from empty account to usable plan. For each, check whether a user can understand what to do next, what is assumed versus confirmed, and how budget, tasks, schedule, vendors, and ideas connect. Improve only the friction found. For community events, include reviewable access/safety/volunteer/permit prompts without asserting universal legal requirements. Keep India-first defaults explicit; validate timezone values or restrict to the supported timezone instead of accepting arbitrary strings. Do not add payments, guest management, or vendor outreach just to close a hypothetical two-point gap.

**Done when.** All three scenario scripts can be completed and exported as evidence (screenshots and concise notes); no AI proposal silently becomes a commitment; docs match actual behavior.

## 5. Suggested sequence and submission gates

| Order | Deliverable | Primary score area | Gate before moving on |
| --- | --- | --- | --- |
| 0 | Preserve evaluated commit/report if available; capture current build, browser, bundle, DB and test baseline | Evidence for all areas | Baseline file records commands, dates, metrics, and machine/deployment context. |
| 1 | Durable production database and tested migration/restart/restore | Security, quality, testing | No ephemeral production writes or upgrade data loss. |
| 2 | Explicit owner parameters, bounded AI/JSON, stored-plan validation | Security, quality, efficiency | Adversarial tests pass; no cross-account or partial-write regression. |
| 3 | Focused component/service refactor and measured page/bundle improvement | Quality, efficiency | Same flows pass; before/after performance is recorded. |
| 4 | Browser E2E, real PDF fixtures, CI and opt-in live AI canary | Testing, alignment | Clean-checkout gates and three event journeys pass. |
| 5 | Manual accessibility fixes and final documentation audit | Accessibility, quality | WCAG 2.2 AA checks recorded; every claim has source or test evidence. |

At every phase, run TypeScript, ESLint, Vitest, and a production build. Re-run the specific security/financial regression tests before any auth, migration, or budget change. Do not use a larger test count or a Lighthouse score alone as proof of quality; the release evidence should include pass/fail, failures corrected, measured before/after, and remaining limits. Re-submit only after this evidence is attached to the exact commit. A 100/100 external score is an aspiration, not a verifiable local acceptance criterion.

## 6. Research basis and limits

- The installed Next.js 16 guides were checked at `node_modules/next/dist/docs/01-app/02-guides/` as required by `AGENTS.md`. Public equivalents: [authentication](https://nextjs.org/docs/app/guides/authentication), [production](https://nextjs.org/docs/app/guides/production-checklist), and [package bundling](https://nextjs.org/docs/app/guides/package-bundling). Re-check the installed guide before future Next code edits.
- [Vercel SQLite support](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel), [SQLite WAL behavior](https://www.sqlite.org/wal.html), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Playwright browser testing](https://playwright.dev/docs/intro), and [web.dev performance metrics](https://web.dev/articles/vitals) are primary sources for the corresponding plan decisions.
- The supplied LawGuide evaluator text describes a different repository. No Gatherly analyzer JSON, exact evaluated revision, live Gemini trace, Lighthouse run, screen-reader record, or deployed restart test was supplied. Those gaps are explicitly gates in this plan, not invented findings.
