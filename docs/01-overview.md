# 1. Overview

## The problem

Partner onboarding is mostly choreography. When ABC Co. signs a new partner, somebody has to:

1. Research the partner and write a value-prop and ideal customer profile (ICP)
2. Draft an internal awareness email for the company
3. Run an intake conversation with the partner to capture integration details and a launch date
4. Build a launch timeline working backward from that date
5. Write three launch communications (Coming Soon, Prepare for Launch, Live) with the right collateral attached
6. Chase the partner if they go quiet
7. Publish a 30-day retro with KPIs, success stories, and a partner-archetype recap

That work is repetitive, gated by handoffs, and easy to drop. Partners notice when launches feel inconsistent.

## The product

**Partner Launch Agent** collapses this entire flow into a single agentic experience:

1. The partnerships lead opens the app and creates a new partner with **three fields**: name, website, contact.
2. The agent runs research, picks a partner archetype (Data Affiliate / Go-To-Market / Platform / Channel), writes the value prop + ICP, and drafts the internal awareness email — all in one call.
3. The partnerships lead reviews/edits/regenerates that email, then clicks **Approve & Launch to Partner**.
4. A partner-facing chat opens at a tokenised URL. The agent walks the partner through three short steps: review the brief, describe the integration (with optional file upload), and commit to a target launch date.
5. When the partner confirms, the agent generates a launch timeline working backward from the target date, with milestones and three pre-drafted launch communications.
6. While the partner intake is open, the agent automatically tracks silence and surfaces 10/20/30-day follow-up alerts on the partner page.
7. After launch, the partnerships team submits KPIs and short success stories. The agent writes a polished 30-day update email and a slide-ready partner-archetype recap.

The whole experience runs on one Next.js process. No queue, no extra services, no auth. A token in the chat URL is the only access control — appropriate for a hackathon demo.

## What the agent actually does

The agent is not a chatbot — it is a workflow with LLM-backed steps:

| Step | Function | Output |
| - | - | - |
| Research | `generateResearchBrief` | Value prop, ICP, archetype + rationale, scope, competitive landscape, risk flags |
| Internal awareness | `generateInternalAwareness` | Markdown email body + subject line |
| Partner chat turns | `partnerChatPrompt` | Templated agent messages, one per chat step |
| Timeline | `generateLaunchTimeline` | 5 milestones + 3 launch communications |
| 30-day retro | `generateMetricsNarrative` | Markdown email + archetype recap slide |
| Follow-up evaluator | `evaluateFollowUps` | Adds 10/20/30-day alerts to the partner |

Each step has a deterministic mock fallback (see [Agent design](./04-agent.md)) so the demo works without an API key.

## What's intentionally out of scope

For the hackathon build, we deliberately skipped:

- **Auth.** No login, no SSO. The token in the partner-chat URL is the only access gate.
- **Multi-tenant.** One ABC Co. tenant. One JSON store.
- **Real queue.** Follow-ups are evaluated on read, not on a scheduler.
- **Streaming LLM output.** All LLM calls are blocking. Fine for the workflow we have.
- **Email/Slack delivery.** Communications are drafted and "marked sent" inside the app — no SMTP, no webhooks.
- **Versioning.** Edits overwrite the prior draft; there's no version history per communication.

These are all reasonable to add later — see the [Operations](./08-operations.md) doc.

## Success criteria (what we want users to feel)

- **First-touch demo:** within 30 seconds a partnerships lead can create a partner and see a coherent internal awareness draft.
- **No empty states that block work:** every screen tells the user what the agent has done and what to do next.
- **The partner experience feels human.** Three short questions, no forms, no surveys. The partner uploads one doc and is done.
- **Nothing silent breaks.** Bad input (e.g. a partner typing "early June" as a target date) is parsed where possible and falls back gracefully where not.
