# Gatherly AI

Gatherly is an event planning assistant for weddings, birthdays, community gatherings, and other celebrations. Organizers create an event with a budget and guest count, review a personalized plan, then manage budget categories, preparation tasks, a day-of timeline, vendor requirements, and quotes. A deterministic change-impact preview explains the consequences of changing a date, guest count, city, or budget before applying changes.

## What works

- Event-specific starter budgets and tasks, with integer-paise calculations and contingency.
- Gemini-generated plans with Zod validation, or clearly labelled starter templates when no Gemini key is configured. A failed configured Gemini call returns an error.
- Review before applying proposed budget categories, tasks, timeline items, and vendor requirements. Partial budget acceptance preserves existing category IDs and attached quotes; the service rebalances untouched allocations only when needed to stay within the budget and refuses to reduce an allocation below confirmed quote commitments.
- A timeline with overlap warnings, vendor checklist with sourcing status, quote comparison, and two-stage quote confirmation and budget application.
- Account-backed sign-in with scrypt password hashes and revocable, database-backed HTTP-only session cookies. Every event requires authentication. An optional, separate example account is available for evaluators.
- PDF quotation extraction with a 5 MB file cap. Gemini reads the PDF in memory when configured; the offline text heuristic is limited to simple uncompressed PDFs. The PDF itself is not saved.
- SQLite-backed request limits: 10 login or registration attempts per email per 15 minutes, a global authentication cap, 10 plan generations per user per hour, and 20 PDF uploads per user per hour. These limits assume one shared SQLite database.

## Local setup

1. Install Node.js 24 and run npm ci.
2. Copy .env.example to .env.local. Set GEMINI_API_KEY to enable Gemini planning and PDF extraction. For production, set APP_ORIGIN to the public HTTPS URL and DATABASE_URL to an absolute path on persistent storage. Vercel's local filesystem is unsupported.
3. Run npm run dev, then open http://localhost:3000.
4. Create an organizer account through Sign in, or fill the separate example account on the sign-in page.

The app creates its SQLite tables on first access in data/gatherly.db, or at DATABASE_URL. Drizzle schema and historical migration files are in src/lib/db; runtime startup currently uses compatible CREATE TABLE IF NOT EXISTS statements for existing databases. Keep a backup of the SQLite file before upgrading a deployment.

## Verification

Run `npm run verify` and `npm run test:e2e`. The browser suite checks guest and cross-account isolation, plan review for the three required event types, and serious axe violations across the workspace. `npm run build` uses Webpack for the same build path in local development, CI, and Docker.

## Scope and limits

This is a single-process SQLite application. It does not process payments, verify email ownership, reset passwords, manage individual guest RSVPs, contact vendors, or book services. AI suggestions and extracted quote fields require human review. Uploaded PDF bytes are sent to Gemini when the API key is configured; avoid uploading documents you do not want processed by that provider. The offline PDF heuristic cannot reliably read scanned or compressed PDFs.

See [release evidence](docs/RELEASE_EVIDENCE.md) for verified checks and remaining gates. DESIGN.md records the visual system, and docs/PRODUCT_SPEC.md, docs/ARCHITECTURE.md, docs/SECURITY_AND_PRIVACY.md, docs/RESEARCH.md, and docs/IMPROVEMENT_PLAN.md cover the product, code, security, research, and improvement decisions.
