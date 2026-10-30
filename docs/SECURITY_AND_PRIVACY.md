# Security and privacy

Updated 30 October 2026.

## Implemented boundaries

- Registration stores normalized, unique email addresses and salted scrypt password hashes. Sign-in issues a random 256-bit bearer token in an HTTP-only, SameSite=Strict cookie (Secure and `__Host-` prefixed in production). Only the SHA-256 token hash is stored in SQLite.
- Sessions expire after 12 hours. Sign-out removes the server record; deleting an account cascades to its sessions. Anonymous requests never inherit a demo identity.
- Event route handlers derive identity from the verified session. Event services scope reads and writes to the owner. A direct event page request redirects to sign-in without a valid session.
- The optional shared example account uses `usr_example` and is disabled by default in production. Its credentials are deliberately exposed by the sign-in UI, so it is for synthetic plans only. Existing `usr_demo` records are not attached to it.
- Browser state-changing requests must carry a matching Origin or Referer, and cross-site Fetch Metadata is rejected. `APP_ORIGIN` enables exact origin comparison behind a proxy. SameSite=Strict adds defense in depth.
- SQLite-backed limits cover sign-in, AI plan generation, and PDF uploads. The API does not return internal error messages on 500 responses.
- Security headers include CSP, frame denial, MIME sniffing prevention, referrer controls, and production HSTS. The CSP allows inline Next.js scripts to preserve static rendering; a nonce-based CSP is a future hardening option with a rendering cost.

## AI and documents

- The Gemini key stays in server code. Event context and planning notes go to Gemini for plan generation; uploaded PDF bytes go to Gemini for quotation extraction when configured.
- Generated plans are schema-validated and staged for human review. Applying a plan uses a SQLite transaction.
- PDF uploads have a 5 MB file cap, basic PDF format checks, and bounded multipart reading. Files are processed in memory and are not served publicly. A PDF header check is not malware scanning.

## Remaining limits

- No email ownership verification, self-service password reset, MFA, or account deletion flow. Provide a support recovery and retention process before onboarding real customers.
- SQLite data is not encrypted at rest by the app. Protect the host, volume, backups, and access to the database file.
- A shared example account can be changed by any person with its published credentials. Use only synthetic data and reset it between evaluations if needed.
- In-app limits are single-node controls. An HTTPS reverse proxy should handle malformed requests, traffic spikes, body limits, and timeouts.

Primary guidance: [Next.js authentication](https://nextjs.org/docs/app/guides/authentication), [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting).
