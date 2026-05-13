# 8. Operations & deployment

This app is currently optimized for a single-process hackathon demo. This doc captures what's needed to take it to production.

## Deployment as-is (single-instance)

The app is a stock Next.js 14 application and runs anywhere Next does:

- **Vercel:** push the repo, set `OPENAI_API_KEY` in the project, deploy. Important: Vercel's file system is **ephemeral**, so `data/store.json` and `uploads/` will be lost on every cold start. Use this only for short-lived demo deploys.
- **Fly.io / Render / Railway:** mount a persistent volume at the repo root so `data/` and `uploads/` survive restarts.
- **Local Docker:**

  ```bash
  npm run build
  docker run -p 3000:3000 -v "$PWD/data:/app/data" -v "$PWD/uploads:/app/uploads" \
    -e OPENAI_API_KEY="$OPENAI_API_KEY" my-image
  ```

## What to harden before production

The hackathon scope skipped several things. Each item below is a single, well-bounded change.

### 1. Authentication

Today the app has none. Internal pages are open; the partner chat is gated only by a `nanoid(14)` token in the URL.

**Recommended:**

- Internal team — wrap pages with NextAuth (SAML/Okta) or Clerk.
- Partner chat — keep the token, but layer in a one-time email verification on first use, and rotate tokens on close.

### 2. Persistent storage

`src/lib/storage.ts` is the only file that knows about the JSON store. Everything else uses these functions:

```
readStore, writeStore, listPartners, getPartner,
getPartnerByChatToken, upsertPartner, updatePartner, deletePartner
```

To swap in Postgres (recommended) or SQLite:

1. Add Prisma / Drizzle.
2. Reimplement those eight functions against the DB.
3. Delete `data/store.json` from `.gitignore` cleanup.

No other code change is required.

### 3. File uploads

`POST /api/partner-chat/:token/upload` writes to local disk. For production:

- Swap to S3 / R2 / GCS.
- Store a signed URL on the `Attachment` instead of relying on local paths.
- Add file-size and MIME-type allowlist (currently `10mb` body limit via `next.config.js`, no MIME filtering).

### 4. Background follow-ups

`evaluateFollowUps` runs on read (when a partner detail page is loaded). For real escalation behaviour:

- Add a scheduled job (cron, Inngest, Trigger.dev, or a `setInterval` worker if single-instance).
- Trigger Slack + email notifications to the partnerships team when a new alert appears.
- Optionally have the agent send a polite nudge to the partner at 10 days, then escalate internal at 20 and 30.

### 5. LLM call costs and rate limits

Per partner you make at most 3 OpenAI calls (research, internal awareness, 30-day narrative). With `gpt-4o-mini` that's well under $0.01 per partner. Still:

- Add per-tenant rate limits.
- Cache the research brief by `(name, website)` if you expect duplicate intakes.
- Add a circuit breaker — if OpenAI is failing, the mock fallback already keeps things working, but you should alert on it.

### 6. Observability

Add the basics:

- Structured logging (pino or similar) instead of `console.error`.
- Request IDs propagated through the agent layer.
- Trace `generateResearchBrief` / `generateInternalAwareness` / `generateMetricsNarrative` durations.
- Counter on mock-fallback hits — this is the canary for OpenAI issues.

### 7. Versioning

Today every edit to `internalAwareness.body` or a launch communication overwrites the previous draft. For audit:

- Add a `revisions: Array<{ at, by, body }>` field per editable artefact.
- Add an "undo / view history" UI.

### 8. Multi-tenant

The app assumes "ABC Co." is the only tenant. To add multi-tenant:

- Add a `tenants` table and a `tenantId` to `Partner`.
- Scope every query in `storage.ts` by tenant.
- Move tenant resolution to a middleware (subdomain or header).

## Configuration matrix

| Setting | Dev default | Prod recommendation |
| - | - | - |
| Storage | JSON file | Postgres |
| Upload storage | local disk | S3 / R2 |
| LLM | mock (no key) | `gpt-4o-mini` with circuit breaker |
| Auth | none | NextAuth + IdP |
| Logging | `console.error` | pino / structured JSON to stdout |
| Background jobs | none (eval on read) | scheduler + Slack/email side-effects |
| Process count | 1 (`next dev`) | N (need shared DB) |

## Health checks

There is no dedicated health endpoint yet. The simplest probe is `GET /api/partners` — it exercises the storage layer.

A more thorough probe would also call `generateResearchBrief({ name: "test", website: "test.com", contact: { name: "t", email: "t@t.com" } })` to validate the OpenAI integration, but you'd want to budget that carefully.

## Cost notes

For a steady state of, say, 5 new partners/week and 1 retro/week:

- 15 research-brief calls/week + 5 internal-awareness + 1 narrative = ~21 LLM calls/week.
- At `gpt-4o-mini` rates, this is **pennies per month**.
- The constraining factor is partner-team time, not compute.

## Backups

If you stay on the JSON store, back up `data/store.json` daily. A single file makes this trivially scriptable.

```bash
# example: hourly local backup
rsync -a data/ backups/data-$(date +%Y%m%d-%H)/
```

On Postgres, use whatever your hosting provider already gives you.
