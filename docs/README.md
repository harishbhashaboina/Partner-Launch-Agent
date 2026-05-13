# Partner Launch Agent — Documentation

A full-stack agentic application that takes a newly-signed partner from **"signed"** to **"live"** with one agent driving the whole flow. Built for the 2026 Growth Hackathon at ABC Co.

This folder contains the full project documentation. If you only have five minutes, read the [Overview](./01-overview.md) and then jump to [Workflows](./03-workflows.md) for the end-to-end story.

## Contents

| # | Document | What's inside |
| - | - | - |
| 1 | [Overview](./01-overview.md) | Problem, product story, what the agent does, and what's intentionally out of scope. |
| 2 | [Architecture](./02-architecture.md) | System diagram, request lifecycle, state machine, technology choices. |
| 3 | [Workflows](./03-workflows.md) | The seven user journeys (internal team + partner) with sequence diagrams. |
| 4 | [Agent design](./04-agent.md) | How the agent is composed, prompt templates, OpenAI vs mock mode, fallback strategy. |
| 5 | [Data model](./05-data-model.md) | The full type surface: Partner, ResearchBrief, ChatState, Timeline, MetricsRetro, FollowUpAlert. |
| 6 | [API reference](./06-api-reference.md) | Every REST endpoint with request/response examples. |
| 7 | [Development guide](./07-development.md) | Local setup, seed data, simulated time, project layout. |
| 8 | [Operations](./08-operations.md) | Deployment notes, environment variables, file storage, what to harden before production. |

## Quick start

```bash
npm install
cp .env.example .env.local      # optional: add OPENAI_API_KEY
npm run seed                    # loads 4 demo partners across stages
npm run dev                     # http://localhost:3000
```

See [Development guide](./07-development.md) for details.

## At a glance

- **Stack:** Next.js 14 (App Router) · TypeScript · TailwindCSS · React Server + Client Components · OpenAI SDK
- **Storage:** Single JSON file at `data/store.json` with atomic writes; uploads at `uploads/`
- **Agent:** OpenAI (`gpt-4o-mini`) when `OPENAI_API_KEY` is set, otherwise a deterministic mock that still produces realistic outputs
- **Surfaces:** Internal team dashboard + partner-facing token-gated chat (no auth)
- **Stages:** `research → internal-review → partner-chat → summarized → launching → live → retro`
