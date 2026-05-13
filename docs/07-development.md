# 7. Development guide

## Prerequisites

- Node.js **20+**
- npm 10+
- (Optional) An OpenAI API key for the LLM-backed agent calls

## Setup

```bash
git clone <repo>
cd "Hackathon 2026"
npm install
cp .env.example .env.local      # optional
npm run seed                    # optional: 4 demo partners across stages
npm run dev
```

App is at [http://localhost:3000](http://localhost:3000).

## Environment variables

All optional. See [`.env.example`](../.env.example).

| Variable | Default | Purpose |
| - | - | - |
| `OPENAI_API_KEY` | _(unset)_ | Enables OpenAI mode. Without it, the agent runs in mock mode — every feature still works. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Override the model. Any chat-completions model your key has access to is fine. |
| `SIMULATED_TODAY` | _(unset)_ | ISO date (e.g. `2026-06-15`). When set, `now()` returns this date — useful for demoing 10/20/30-day follow-up escalations without waiting. |

## Scripts

| Script | What it does |
| - | - |
| `npm run dev` | Next.js dev server with HMR on port 3000. |
| `npm run build` | Production build. |
| `npm start` | Run the production build. |
| `npm run lint` | ESLint (Next.js preset). |
| `npm run seed` | Loads `data/store.json` with 4 demo partners across all stages. **Overwrites** any existing store. |

## Seed data

`npm run seed` creates four partners, each at a different stage, so you can demo the whole flow without going through it:

| Partner id | Stage | Useful for demoing |
| - | - | - |
| `demo-loop-data` | `internal-review` | Reviewing/editing/approving the internal awareness comm; "Approve & Launch to Partner". |
| `demo-northbeam` | `partner-chat` | Partner chat mid-flight (one round of messages exchanged). |
| `demo-helix-platform` | `launching` | Full launch timeline with milestones and three drafted comms. |
| `demo-quietchannel` | `partner-chat` (silent) | Follow-up escalations — set `SIMULATED_TODAY` to force 10/20/30-day banners. |

The partner-facing chats for these are at:

- `/partner-chat/demo-northbeam-token`
- `/partner-chat/demo-helix-token`
- `/partner-chat/demo-quietchannel-token`

## Simulating time

Edit `.env.local`:

```ini
SIMULATED_TODAY=2026-06-15
```

Restart `npm run dev`. The `now()` helper in `src/lib/time.ts` now returns June 15, 2026. Reload `/partners/demo-quietchannel` — you'll see the 30-day escalation banner because the partner's last interaction was 50+ days before the simulated today.

This is non-invasive: `Date` itself is not mocked, only the in-app reference.

## Project layout (one-pager)

```
src/app/               # routes (pages + api)
src/components/        # shared React components
src/lib/               # domain + agent + storage (no React)
scripts/               # one-off scripts (seed)
data/store.json        # the entire app state (gitignored)
uploads/               # partner uploads (gitignored)
docs/                  # this folder
```

## Working with the store

The store lives at `data/store.json`. You can inspect or hand-edit it freely — the app picks up changes on the next read.

To wipe state:

```bash
rm data/store.json uploads/*
```

To inspect:

```bash
cat data/store.json | python3 -m json.tool | less
```

## Adding a new agent capability

1. Add a function in `src/lib/agent.ts` with a `Promise<...>` return type.
2. Wrap any OpenAI call in `if (client) { try { ... } catch { ... } }`. **Always** provide a mock fallback that returns a sane default.
3. Expose it via a new route under `src/app/api/`. Keep routes thin — they should orchestrate, not implement business logic.
4. Update [data model](./05-data-model.md) and [api reference](./06-api-reference.md).

## Running the type-checker and build

```bash
npx tsc --noEmit         # types only, no emit
npm run build            # full Next.js production build
```

Both should be clean on `main`.

## Common gotchas

- **`data/store.json` not updating in dev.** Make sure you're hitting `POST` / `PATCH` endpoints; `GET`s only run the follow-up evaluator. If you hand-edit the file while the dev server is running, your edit might be overwritten by a concurrent write — stop the server first.
- **Two `next dev` processes against the same `data/`.** Will cause lost writes. Don't.
- **Mocked partner replies failing date parse.** The parser handles most phrasings (`21st June`, `early June`, `Q3 2026`, ISO, etc.). For anything else, the timeline generator falls back to "today + 45 days" silently — so the workflow continues even if the partner typed something exotic. See [Agent design](./04-agent.md) for the full list of accepted phrasings.
- **`localhost:3000` already in use.** Kill the existing process or run `next dev -p 3001`.
