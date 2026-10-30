# Tech stack

Status: updated after the 30 October 2026 implementation pass. The original independent research and baseline audit remain in RESEARCH.md and REVIEW.md.

| Layer | Current implementation |
| --- | --- |
| Web | Next.js 16.4.3 App Router, React 19.2.8, TypeScript |
| UI | Tailwind CSS 3 and native forms/buttons with focus and status semantics |
| Data validation | Zod 4 for API bodies, event dates, schedule times, AI plans, and extracted quote candidates |
| Identity | Local organizer accounts with salted scrypt password hashes; revocable random sessions in HTTP-only cookies |
| Database | SQLite via better-sqlite3 and Drizzle ORM; persistent local file, runtime table initialization |
| AI | Server-side Google Gen AI SDK, default gemini-2.5-flash; deterministic templates when no key is configured |
| Documents | Bounded in-memory PDF upload, inline Gemini interpretation, limited offline text heuristic; no retained PDF file |
| Tests | Vitest unit and route integration tests, TypeScript, ESLint, production build |

## Data flow

Browser pages call Next.js route handlers. Each event route derives a verified database-backed session and checks ownership. Services coordinate SQLite writes; budget, seeding, and change-impact rules are deterministic. Gemini output is validated and staged. The organizer reviews proposed budget categories, tasks, agenda items, and vendor requirements before the service writes them in a transaction. Quote extraction returns a candidate only; saving a quote requires another user action.

## Deployment boundary

One long-running Node process and a persistent SQLite file are expected. The request limiter also uses SQLite, so all traffic must share the same database. Runtime startup uses manual compatible CREATE TABLE statements; Drizzle migration files are not executed automatically. This should be consolidated in a future schema migration cleanup after upgrade coverage is added.
