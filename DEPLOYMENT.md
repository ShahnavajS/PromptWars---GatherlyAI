# Deployment

Gatherly needs a long-running Node.js 24 host and a persistent SQLite disk. Run **one Node process per database file**. An ephemeral serverless filesystem will lose accounts and events.

## Release setup

1. Run `npm ci`, `npm run verify`, and `npm run test:e2e`. The browser suite uses an isolated disposable database and a local Chromium server.
2. Set `DATABASE_URL` to an absolute path on a mounted persistent volume, outside `public/` and temporary storage. Production does not have a default path. Vercel's ephemeral filesystem is unsupported for this SQLite deployment.
3. Set `APP_ORIGIN` to the exact public HTTPS origin, for example `https://events.example.com`. The app uses it to validate browser mutations.
4. Set `GEMINI_API_KEY` if live AI planning and PDF quotation extraction are wanted. Without it, plans use starter templates.
5. Keep `EXAMPLE_ACCOUNT_ENABLED` unset for a private deployment. For an evaluator deployment, set it to `true` and optionally set `EXAMPLE_ACCOUNT_PASSWORD`. The sign-in page displays these credentials. Changing the password revokes example sessions on the next login. This shared account is separate from legacy `usr_demo` events and must contain only synthetic data.
6. Run `npm start` behind an HTTPS reverse proxy. Keep the Node server on a private interface. Configure proxy request body limits (at least 6 MB for PDF uploads), rate limits, timeouts, and TLS.

Runtime initialization creates missing tables and adds compatible columns; Drizzle migration files are historical records and do not run at startup. A failed compatibility upgrade now stops startup. Back up the SQLite database before upgrades. Use SQLite's online backup command or stop the server before copying it: copying only the `.db` file during WAL writes may miss data.

With the SQLite CLI installed, make a consistent backup while the server is running:

```sh
sqlite3 "$DATABASE_URL" ".backup '/secure-backups/gatherly-$(date +%F-%H%M%S).db'"
sqlite3 /secure-backups/gatherly-YYYY-MM-DD-HHMMSS.db 'PRAGMA integrity_check;'
```

For a restore, stop the Node process, move the current database and its WAL/SHM sidecars to a safe recovery location, copy the verified backup to `DATABASE_URL`, then restart one process and run the smoke check below. The automated schema test exercises an online backup and restoration with two synthetic owners and events; perform the same drill on your deployment volume before onboarding users.

## Security operations

- Anonymous event API requests return 401 in every environment; direct `/events/...` visits redirect to sign-in. Event services scope reads and writes to the signed-in owner.
- Sessions expire after 12 hours and are revoked server-side on sign-out. The cookie is HTTP-only, Secure on production, and SameSite=Strict.
- Login is limited per email and globally in SQLite. AI plan and upload limits are per user. These controls assume one SQLite database and do not replace reverse-proxy protection.
- Uploaded PDFs are processed in memory and are not retained. With Gemini configured, PDF bytes and event planning context are sent to Google's API. Protect the database, backups, TLS keys, and Gemini key.
- The app does not yet offer email verification, self-service password reset, or MFA. Establish a support recovery process before onboarding real customers.

## Smoke check

After release, verify that `GET /api/auth/session` and `GET /api/events` return 401 without a cookie, a direct event URL redirects to sign-in, login creates a cookie, event creation and plan review work, another account cannot open that event, and sign-out immediately invalidates the cookie. Review the browser console for CSP violations. Live Gemini calls and assistive-technology behavior need separate manual checks.
