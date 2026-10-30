# Release evidence — 31 October 2026

This records the local implementation checks for the post-evaluation improvement pass. The Gatherly evaluator has not rerun; **100/100 is not claimed**.

| Gate | Result | Evidence |
| --- | --- | --- |
| TypeScript | Pass | `tsc --noEmit --incremental false` with Node 24.21.0. |
| ESLint | Pass | Repository-wide ESLint run. |
| Unit and integration | Pass | 149 Vitest tests in 27 files; includes owner boundaries, AI review, date and money logic, bounded JSON, historical schema upgrade, online backup/restore, and an uncompressed PDF upload candidate. |
| Browser | Pass | 6 Playwright journeys on local Chrome with a disposable database: guest/cross-account denial, wedding/birthday/community create-and-review, partial plan selection, vendor quote confirmation and budget effect, and serious/critical axe scans on sign-in, setup, overview, every workspace section, a populated AI proposal, the quote form, and the comparison dialog. The comparison dialog's opening focus, Escape close, and return focus were checked. |
| Production build | Pass | Next.js 16.4.3 Webpack build with Node 24.21.0, a synthetic absolute database path, no Gemini key, and a synthetic HTTPS origin. |
| Production restart | Pass | Built server returned guest `401`, direct private URL `307`, registration `200`, event creation `201`, and owner-scoped event HTML. After stopping and restarting on the same synthetic SQLite file, the account and event remained; a second account received `404` for the event. The synthetic database was removed after the check. |
| Dependency audit | Pass | `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities on the day of the check. |
| Docker image | Local check unavailable | Docker Desktop's Linux engine was unavailable on this machine. CI is configured to build the image; that gate has not yet run remotely. |

The browser tests use Next development mode because production requires a public HTTPS origin for browser writes. The separate restart check exercises the production build and API with a synthetic origin. Before accepting real customer data, run the documented backup/restore drill and smoke check on the actual HTTPS host and mounted volume. A live Gemini canary, scanned or compressed PDF extraction, and a manual keyboard/screen-reader walkthrough remain external release checks. Automated axe scans do not replace assistive-technology testing.
