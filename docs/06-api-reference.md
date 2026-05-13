# 6. API reference

All endpoints are Next.js App Router route handlers under `src/app/api/`. All requests and responses are JSON unless noted. Errors return `{ "error": string }` with an appropriate 4xx/5xx status.

## Partner CRUD

### `GET /api/partners`

List all partners.

**Response 200**

```json
{
  "partners": [Partner, Partner, ...]
}
```

Order is "most recently created first" (driven by `Store.order`).

### `POST /api/partners`

Create a partner and run the full intake pipeline (research → internal awareness draft). This is the **flagship endpoint** — one call replaces the bulk of partner onboarding.

**Body**

```json
{
  "name":         "Acme Data Co",
  "website":      "acmedata.com",
  "contactName":  "Jordan Lee",
  "contactEmail": "jordan@acmedata.com"
}
```

**Response 200**

```json
{
  "partner": Partner /* with research + internalAwareness; stage = "internal-review" */
}
```

Failure modes are graceful — if the LLM call fails, the mock fallback runs and the user still gets a partner.

### `GET /api/partners/:id`

Fetch a single partner. Also runs the follow-up evaluator and persists any newly-triggered alerts.

**Response 200**

```json
{ "partner": Partner }
```

**Response 404** if no partner with that id exists.

### `PATCH /api/partners/:id`

Patch fields on a partner. Any subset of the partner shape is accepted and merged in.

**Body** (example)

```json
{ "contact": { "name": "Jordan Lee", "email": "new@acmedata.com" } }
```

### `DELETE /api/partners/:id`

Remove the partner from the store.

---

## Internal awareness lifecycle

### `POST /api/partners/:id/internal-awareness`

Approve, edit, or regenerate the internal awareness email.

**Body**

```json
{
  "action":  "approve" | "regenerate" | "edit",
  "subject": "..." /* required if action = "edit" */,
  "body":    "..." /* required if action = "edit" */
}
```

- `approve` — sets `internalAwareness.approvedAt`.
- `regenerate` — calls `generateInternalAwareness()` again and replaces the draft.
- `edit` — overwrites subject and/or body with the values in the request.

**Response 200**

```json
{ "partner": Partner }
```

---

## Launch the partner chat

### `POST /api/partners/:id/launch-chat`

Open the partner-facing chat. Creates a `nanoid(14)` token, builds the welcome message, transitions stage to `partner-chat`.

**Response 200**

```json
{ "partner": Partner, "token": "abc123..." }
```

**Response 400** if the partner does not yet have a research brief.

Idempotent: if `partner.partnerChat` already exists, the existing token is returned.

---

## Timeline

### `POST /api/partners/:id/timeline`

Generate (or regenerate) the launch timeline. Auto-heals stored bad `targetDate` values (e.g. raw text from earlier intake) by overwriting them with the resolved ISO date.

**Response 200**

```json
{ "partner": Partner /* with timeline; stage may transition summarized → launching */ }
```

**Response 500** with `{ "error": string }` only if something exceptional happens (the resolver itself never throws — it always returns a valid date).

### `PATCH /api/partners/:id/timeline`

Update one of the three launch communications.

**Body**

```json
{
  "commId": "coming-soon" | "prepare-for-launch" | "new-partner-live",
  "status": "scheduled" | "drafted" | "sent",  /* optional */
  "subject": "...",                            /* optional */
  "bodyMd":  "..."                             /* optional */
}
```

Marking the `new-partner-live` comm as `sent` transitions the partner to `live`.

---

## Metrics retro

### `POST /api/partners/:id/metrics`

Submit 30-day KPIs and stories; the agent writes the email and the archetype recap.

**Body**

```json
{
  "kpis": {
    "Partner-influenced ARR": "$420K",
    "Joint customer adoption": "38%",
    "Open opps in pipeline": "22",
    "Win rate uplift": "+8.5pp"
  },
  "successStories": "Acme Corp closed in 21 days vs avg 60..."
}
```

**Response 200**

```json
{ "partner": Partner /* with metrics; stage = "retro" */ }
```

---

## Follow-ups

### `POST /api/partners/:id/follow-ups`

Evaluate or acknowledge follow-up alerts.

**Body**

```json
{ "action": "evaluate" }            /* re-runs the silence detector */
```

or

```json
{ "action": "ack", "level": 10 | 20 | 30 }
```

`evaluate` is normally not needed because `GET /api/partners/:id` runs it automatically.

---

## Partner-facing chat

### `GET /api/partner-chat/:token`

Hydrate the partner-facing chat. Returns a slim partner shape (no internal awareness, no metrics, no follow-ups) plus the chat state.

**Response 200**

```json
{
  "partner": {
    "id": "...",
    "name": "...",
    "website": "...",
    "contact": { "name": "...", "email": "..." },
    "research": ResearchBrief
  },
  "chat": PartnerChatState
}
```

### `POST /api/partner-chat/:token/message`

Send a partner message. The route appends the partner's message, advances the chat step, captures structured input into `partnerInputs`, and appends the agent's next message (or two, if transitioning into `summary`).

**Body**

```json
{
  "content": "Auth is OAuth2 with PKCE...",
  "attachments": [Attachment, ...]   /* optional, from the upload endpoint */
}
```

**Response 200**

```json
{ "chat": PartnerChatState }
```

Date parsing on the `target-date` step is robust to a wide variety of phrasings (see [Agent design](./04-agent.md) → `resolveTargetDate`).

### `POST /api/partner-chat/:token/upload`

Multipart form upload. Field name is `file`.

**Response 200**

```json
{
  "attachment": {
    "id": "nanoid",
    "name": "Helix-ABC-Integration-Spec.md",
    "size": 14820,
    "mimeType": "text/markdown",
    "uploadedAt": "2026-05-12T10:00:00.000Z",
    "excerpt": "# Helix x ABC..."   /* present for text files only */
  }
}
```

Files are written to `uploads/<nanoid>-<safeName>`. The returned `Attachment` object should be sent on the next `/message` call to persist it on the message.

### `POST /api/partner-chat/:token/close`

Partner confirms the summary; intake closes; timeline is generated.

**Response 200**

```json
{ "partner": Partner /* stage = "launching", with summary + timeline */ }
```

---

## Conventions

- All timestamps are **ISO 8601** strings (`new Date().toISOString()`).
- All ids are URL-safe and case-sensitive (nanoid alphabet).
- All endpoints are **idempotent** in the strict sense for `GET`/`DELETE`, and tolerate retries for `POST`/`PATCH` — repeating a `POST /api/partners/:id/timeline` produces an updated but equivalent timeline.
- The agent badge in the response header is _not_ surfaced via API; the client reads it from `agentMode()` at render time.

## Status codes

| Code | When |
| - | - |
| 200 | Success. |
| 400 | Validation failure (missing fields, prerequisite stage not reached). |
| 404 | Partner or chat token not found. |
| 500 | Unexpected exception. The error message is included as `{ "error": ... }`. |
