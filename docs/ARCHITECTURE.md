# Architecture

Gatherly is a Next.js 16 App Router application with React 19, TypeScript, Drizzle ORM, and a local SQLite database. The browser calls route handlers; handlers validate input and identity, call services, and return JSON. Domain calculations remain deterministic. Gemini only generates proposals or extracts candidate fields.

## Code map

- src/app/page.tsx and src/app/events/*: event list, creation, and workspace screens.
- src/app/sign-in/page.tsx and src/app/api/auth/session/route.ts: registration, sign-in, session display, and sign-out.
- src/app/api/ai/plan/*: generate, retrieve, and review staged plans.
- src/app/api/events/*: event, budget, task, change-impact, schedule, vendor, requirement, quote, and PDF endpoints.
- src/components/*: plan review, preferences, timeline, vendor hub, quote review, and change-impact interface.
- src/lib/auth/*: account hashing, revocable SQLite sessions, origin validation, and SQLite request limits.
- src/lib/ai/*: prompts, Gemini client, normalized plan schema, and type-specific starter plans.
- src/lib/domain/*: budget, seeding, date formatting, and impact rules.
- src/lib/services/*: event ownership and database operations.
- src/lib/db/schema.ts and index.ts: typed schema plus runtime SQLite initialization.
- tests/unit and tests/integration: calculations, services, and route handlers.

## Main write paths

Event creation validates fields, inserts the event, budget, categories, tasks, preferences, and initial activity in a transaction. Plan generation reads owned event state, calls Gemini or a starter template, then stores a pending suggestion. Review applies selected categories, tasks, schedule items, and vendor requirements in a transaction. Quote extraction only returns a candidate; saving a quote is a separate user action. Change impact previews without writing, then confirms selected effects with an event version check.

## Persistence and deployment

SQLite must live on persistent storage. Runtime initialization uses CREATE TABLE IF NOT EXISTS and compatibility ALTER statements, while Drizzle migrations are retained as historical schema files. The event list uses grouped sums and counts in a fixed number of queries. The current architecture assumes one Node server process and one shared SQLite file.
