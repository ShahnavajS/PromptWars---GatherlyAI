# Gatherly AI — Deployment Guide

> Plan smarter. Spend wisely. Bring everyone together.

This guide covers deploying Gatherly AI for production or hackathon demonstration.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20 LTS or later |
| npm | 10+ |
| Persistent disk | Required (SQLite + local file uploads) |

> [!IMPORTANT]
> Gatherly AI uses **SQLite** for its database and **local filesystem** for private file uploads.
> It **cannot** be deployed to ephemeral serverless platforms (e.g., Vercel Functions, AWS Lambda with no EFS mount)
> because the database and uploads directory would be wiped on each cold start.
>
> **Recommended hosting:** Railway, Render, Fly.io, or any VPS/container with a persistent mounted volume.

---

## 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

### Required in Production

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random secret for signing session tokens. **Must be 32+ characters.** Generate with: `openssl rand -base64 32` |

### Required for AI Features

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey). Without this, the app falls back to deterministic offline templates — all non-AI features still work. |

### Optional

| Variable | Default | Description |
|---|---|---|
| `GEMINI_MODEL` | `gemini-2.5-flash` | Override the Gemini model version |
| `DATABASE_URL` | `./data/gatherly.db` | SQLite database file path |
| `ALLOW_DEMO_AUTH` | `true` (dev) / must be set explicitly | Set to `true` only on explicitly labelled demo deployments. In production with real users, leave unset or set to `false` and implement proper authentication. |
| `NODE_ENV` | — | Set to `production` by your host automatically on `npm start` |

> [!CAUTION]
> **Never commit `.env.local` to version control.** It is git-ignored. Check with `git status --ignored` before pushing.

---

## 2. Install Dependencies

```bash
npm ci
```

---

## 3. Database Setup

Run the database migration to create all tables:

```bash
npm run db:push
```

This creates `./data/gatherly.db` (or the path set in `DATABASE_URL`).

> [!NOTE]
> The `data/` directory is git-ignored. On a fresh deployment or new persistent volume, run `db:push` once before starting the app.

---

## 4. Build for Production

```bash
npm run build
```

This produces an optimised Next.js output in `.next/`.

---

## 5. Start the Production Server

```bash
npm start
```

The application listens on port **3000** by default.

To use a different port:
```bash
PORT=8080 npm start
```

---

## 6. Persistent Volume Requirements

Mount a persistent volume and ensure the following paths survive restarts:

| Path | Purpose |
|---|---|
| `./data/` | SQLite database file (`gatherly.db`) |
| `./private_uploads/` | Vendor quotation documents (PDF, images) |

On Railway or Render, attach a persistent disk and set the mount path to the project root (or configure `DATABASE_URL` to point to the mounted path).

---

## 7. File Upload Security

Uploaded vendor documents are stored in `./private_uploads/` and served **only through authenticated API routes** (`/api/events/[id]/quotes/[quoteId]`). Direct filesystem access from browsers is not exposed.

Ensure your reverse proxy (nginx, Caddy, etc.) does **not** serve `private_uploads/` as a static directory.

---

## 8. Security Checklist

- [ ] `AUTH_SECRET` is set to a 32+ character random value
- [ ] `GEMINI_API_KEY` is set (or app is running in fallback/demo mode deliberately)
- [ ] `.env.local` is not committed to git (`git status --ignored` shows it as ignored)
- [ ] `ALLOW_DEMO_AUTH` is explicitly set or left unset for production multi-user deployments
- [ ] `private_uploads/` is not publicly accessible via HTTP
- [ ] HTTPS is enforced (via your host or reverse proxy)
- [ ] `NODE_ENV=production` is set (done automatically by most hosts with `npm start`)

---

## 9. Hackathon / Demo Deployment

For a quick single-organiser demo:

1. Set `GEMINI_API_KEY` to your key from Google AI Studio
2. Set `AUTH_SECRET` to any 32+ char random string
3. Set `ALLOW_DEMO_AUTH=true` (allows the app to use the built-in `demo@gatherly.ai` organiser without a login form)
4. Run `npm run db:push`, then `npm run build`, then `npm start`
5. Access at `http://localhost:3000`

> [!TIP]
> If Gemini is unavailable or rate-limited, the app silently falls back to high-quality deterministic templates. The full budget, task, timeline, vendor, and change-impact features work without Gemini.

---

## 10. Verification

Before deploying, verify the full quality gate passes:

```bash
npm run verify
```

This runs TypeScript type-checking, ESLint, Vitest tests, and a production build in sequence.

Expected output (Phase 7 baseline):
- **127 tests / 18 files** passing
- **0** TypeScript errors
- **0** ESLint errors or warnings
- **Build:** succeeded

---

## 11. Health Check

After starting, confirm the app is running:

```bash
curl http://localhost:3000/api/events
# Expected: { "success": true, "events": [] }
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `AUTH_SECRET environment variable must be set in production` | `AUTH_SECRET` not set | Add it to `.env.local` |
| `500` on all API calls | DB not migrated | Run `npm run db:push` |
| AI plan shows validation error | `GEMINI_API_KEY` invalid or model issue | Verify the key; app will use fallback templates if key is absent |
| Uploads not found after redeploy | `private_uploads/` on ephemeral storage | Mount a persistent disk |
| Port already in use | Another process on port 3000 | Set `PORT=<other>` before `npm start` |

