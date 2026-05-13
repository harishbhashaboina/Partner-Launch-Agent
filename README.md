# Partner Launch Agent

A full-stack agentic application that takes a newly-signed partner from **"signed"** to **"live"** with minimal human effort. Built for the 2026 Growth Hackathon at ABC Co.

> Open "New Partner Agent" → drop in name, website, contact → the agent does the rest: research, internal awareness comm, partner intake chat, integration capture, launch timeline, three launch communications, follow-ups at 10/20/30 days, and a 30-day retro complete with a partner-archetype recap slide.

📚 **Full documentation: [`docs/`](./docs/README.md)** — overview, architecture, workflows, agent design, data model, API reference, dev guide, and operations notes.

---

## Why this exists

Partner onboarding is mostly choreography. A partner is signed; then somebody has to draft the internal comms, brief the partner team, run an intake chat with the partner, generate a timeline, write the three launch comms (Coming Soon, Prepare for Launch, Live), chase the partner if they go quiet, and finally publish a 30-day retro. This app collapses that work into a single agentic flow.

---

## What's in the box

### 1. Internal team workflow

- **Dashboard** (`/`) — pipeline of every partner with stage and follow-up alerts.
- **New Partner** (`/new`) — 4-field form. The agent runs research + drafts the internal awareness comm in one go.
- **Partner detail** (`/partners/[id]`) — tabs for:
  - **Research** — Value Prop, ICP, Archetype + rationale, Scope, Competitive landscape, Risk flags.
  - **Internal Awareness** — markdown email draft. Edit, regenerate, approve. After approval, "Approve & Launch to Partner" opens the partner chat.
  - **Partner Chat** — read-only mirror of the partner-facing intake thread, captured inputs, share-link copy.
  - **Summary** — finalized intake (value prop, ICP, scope, integration overview, target date, attachments).
  - **Launch Timeline** — milestones working back from the target date + three launch communications (Coming Soon, Prepare for Launch, Live) with mark-as-sent.
  - **30-day Retro** — KPI + success-story inputs that generate a polished email and a slide-ready partner-archetype recap (Data Affiliate / Go-To-Market / Platform / Channel).
- **Follow-up alerts** — at 10/20/30 days of partner silence, a banner appears on the partner page. Acknowledge to clear.

### 2. Partner-facing chat

`/partner-chat/[token]` — a focused, chat-style intake (think Claude-style thread). The partner:

1. Reviews the auto-generated brief and shares additions/edits.
2. Describes the integration and uploads an integration doc.
3. Commits to a target completion date.
4. Confirms the summary, which closes the intake and triggers the launch timeline.

No login — the token in the URL is the access control (good enough for a hackathon demo). The chat supports file uploads, multi-step state, typing indicators, and graceful summary/close.

### 3. Agent layer

`src/lib/agent.ts` is the agent. It has **two modes**:

- **OpenAI mode** (set `OPENAI_API_KEY`): the agent uses the OpenAI Chat Completions API (default `gpt-4o-mini`) for research, internal comms, and the 30-day narrative.
- **Mock mode** (no key): a deterministic, surprisingly-good fallback that inspects the partner name and website to pick a plausible vertical, archetype, value prop, and ICP. The whole demo runs end-to-end without any API key — great for offline demos.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: add OPENAI_API_KEY
npm run seed                 # optional: load 4 demo partners across stages
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If you ran `npm run seed`, jump straight to:

- `/partners/demo-loop-data` — fresh, ready for internal review
- `/partners/demo-northbeam` — partner chat mid-flight
- `/partners/demo-helix-platform` — launching, full timeline
- `/partners/demo-quietchannel` — partner gone quiet (follow-up alerts firing)

Or visit the partner-facing side via:

- `/partner-chat/demo-northbeam-token`
- `/partner-chat/demo-helix-token`

### Simulating time

Set `SIMULATED_TODAY=2026-06-15` in `.env.local` to make follow-up alerts trigger off a simulated "today". Useful to demo the 10/20/30-day escalation banner.

---

## Architecture

```
Next.js 14 (App Router)        ←  single-process full-stack
├─ src/app                     UI + API route handlers
│   ├─ page.tsx                Dashboard
│   ├─ new/                    New partner intake (internal)
│   ├─ partners/[id]           Internal partner workspace
│   ├─ partner-chat/[token]    External partner-facing chat
│   └─ api/                    REST API
├─ src/lib
│   ├─ types.ts                Domain types
│   ├─ agent.ts                OpenAI + deterministic mock agent
│   ├─ storage.ts              File-backed JSON store (data/store.json)
│   ├─ followups.ts            10/20/30-day silence detector
│   └─ time.ts                 Time helpers + SIMULATED_TODAY support
└─ src/components              Shared UI (Markdown, StageRail, PartnerCard, ...)
```

**Storage** is a single `data/store.json` written atomically via a tiny in-process write lock. For a hackathon this is faster to iterate than Postgres and zero-config to demo. Uploads land in `uploads/`. Swap in a real DB later — every read goes through `storage.ts`.

**Agent** calls are server-side only and isolated to `src/lib/agent.ts`. Each capability (research, internal awareness, partner chat prompt, timeline, 30-day narrative) is its own function with a mock fallback, so any single LLM hiccup degrades gracefully instead of breaking the flow.

---

## API surface (cheat sheet)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/partners` | List partners |
| POST | `/api/partners` | Create partner + run research + draft internal comm |
| GET | `/api/partners/:id` | Get partner (auto-evaluates follow-ups) |
| PATCH | `/api/partners/:id` | Patch partner fields |
| DELETE | `/api/partners/:id` | Delete partner |
| POST | `/api/partners/:id/internal-awareness` | `action: approve | regenerate | edit` |
| POST | `/api/partners/:id/launch-chat` | Open the partner-facing chat |
| POST | `/api/partners/:id/timeline` | (Re)generate the launch timeline |
| PATCH | `/api/partners/:id/timeline` | Mark a launch comm as sent / edit it |
| POST | `/api/partners/:id/metrics` | Submit 30-day metrics → generate narrative + slide |
| POST | `/api/partners/:id/follow-ups` | `action: ack | evaluate` |
| GET | `/api/partner-chat/:token` | Public chat hydration |
| POST | `/api/partner-chat/:token/message` | Partner sends a message; agent advances state |
| POST | `/api/partner-chat/:token/upload` | Attach a file (integration doc) |
| POST | `/api/partner-chat/:token/close` | Confirm summary, close intake, generate timeline |

---

## Partner Archetype recap (built into the 30-day retro)

The 30-day retro auto-generates a slide-ready recap describing where the partner sits across the four ABC archetypes:

- **Data Affiliate** — integration-first, ~91% of partners, API-fee monetization.
- **Go-To-Market** — referral ally, ~5%, revenue share.
- **Platform** — resell partner, ~3%, margin/reseller.
- **Channel** — lead generator, ~1%, gross revenue.

The full comparison table (sales motion, value, traits, KPIs, monetization, revenue potential, % of partners) is generated for every partner at retro time.

---

## What I'd add next (post-hackathon)

- Real auth + per-partner ACLs (today the token in the chat URL is the only gate).
- Postgres + Prisma swap for `storage.ts`.
- Webhook-driven follow-ups (cron + Slack/email).
- Streaming responses for the LLM-backed steps.
- Versioned templates with rollback per partner.

---

Built in one focused sprint. Have fun launching partners.
