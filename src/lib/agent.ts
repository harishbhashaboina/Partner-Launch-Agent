import OpenAI from "openai";
import type {
  InternalAwareness,
  LaunchTimeline,
  MetricsRetro,
  Partner,
  PartnerArchetype,
  ResearchBrief,
} from "./types";
import { addDays, formatISO } from "./time";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

const client = apiKey ? new OpenAI({ apiKey }) : null;

export function agentMode(): "openai" | "mock" {
  return client ? "openai" : "mock";
}

async function complete(
  system: string,
  user: string,
  json = false,
): Promise<string> {
  if (!client) throw new Error("No OpenAI client");
  const res = await client.chat.completions.create({
    model,
    temperature: 0.55,
    response_format: json ? { type: "json_object" } : { type: "text" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

// ---------- Research / Value Prop / ICP ----------

const ARCHETYPES: PartnerArchetype[] = [
  "Data Affiliate",
  "Go-To-Market",
  "Platform",
  "Channel",
];

export async function generateResearchBrief(input: {
  name: string;
  website: string;
  contact: { name: string; email: string };
}): Promise<ResearchBrief> {
  if (client) {
    try {
      const sys = `You are ABC Co's Partner Strategy AI. Given a prospective partner's basic information, you produce a concise research brief. Return STRICT JSON with keys: valueProp, idealCustomerProfile, archetype (one of "Data Affiliate" | "Go-To-Market" | "Platform" | "Channel"), archetypeRationale, scope, competitiveLandscape, riskFlags (array of short strings). Keep each field under 90 words. Be specific, avoid fluff.`;
      const usr = `Partner: ${input.name}\nWebsite: ${input.website}\nContact: ${input.contact.name} <${input.contact.email}>\n\nProduce the brief.`;
      const raw = await complete(sys, usr, true);
      const parsed = JSON.parse(raw);
      const archetype: PartnerArchetype = ARCHETYPES.includes(parsed.archetype)
        ? parsed.archetype
        : "Data Affiliate";
      return {
        valueProp: String(parsed.valueProp ?? ""),
        idealCustomerProfile: String(parsed.idealCustomerProfile ?? ""),
        archetype,
        archetypeRationale: String(parsed.archetypeRationale ?? ""),
        scope: String(parsed.scope ?? ""),
        competitiveLandscape: String(parsed.competitiveLandscape ?? ""),
        riskFlags: Array.isArray(parsed.riskFlags)
          ? parsed.riskFlags.map(String).slice(0, 6)
          : [],
      };
    } catch (err) {
      console.error("OpenAI research failed, falling back to mock", err);
    }
  }
  return mockResearch(input);
}

function mockResearch(input: {
  name: string;
  website: string;
}): ResearchBrief {
  const host = safeHost(input.website);
  const slug = host.replace(/\..*/, "");
  const verticalGuess = guessVertical(input.name + " " + host);
  const archetype = guessArchetype(input.name, host);
  return {
    valueProp: `${input.name} accelerates ${verticalGuess.audience} workflows with ${verticalGuess.capability}. Integrated with ABC, joint customers get a unified path from ${verticalGuess.from} to ${verticalGuess.to}, reducing manual reconciliation and shrinking time-to-value by an estimated 30–40%.`,
    idealCustomerProfile: `Mid-market and upper-mid-market ${verticalGuess.audience} (200–5,000 employees) running ${verticalGuess.stack}. Strong fit for teams with a dedicated ${verticalGuess.owner} who already operate on a modern data stack and need ${verticalGuess.painPoint} resolved.`,
    archetype,
    archetypeRationale: archetypeRationale(archetype, input.name),
    scope: `Phase 1 (60 days): production-grade API integration with ABC, joint co-marketing landing page, and one anchor customer reference. Phase 2 (post-launch): expanded ${slug}↔ABC sync surface, in-product cross-promotion, and quarterly business reviews.`,
    competitiveLandscape: `${input.name} sits alongside a small set of point solutions but differentiates through ${verticalGuess.diff}. ABC's partnership tightens the seam between ${verticalGuess.from} and ${verticalGuess.to}, an area where competitors still rely on manual exports.`,
    riskFlags: [
      "Integration ownership and SLA not yet confirmed",
      "Need security review for any data sharing in scope",
      "Confirm legal/contract path before public co-marketing",
    ],
  };
}

function safeHost(website: string): string {
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

function guessVertical(seed: string): {
  audience: string;
  capability: string;
  stack: string;
  owner: string;
  painPoint: string;
  from: string;
  to: string;
  diff: string;
} {
  const s = seed.toLowerCase();
  if (/(crm|sales|hubspot|salesforce|revenue|outreach)/.test(s)) {
    return {
      audience: "revenue and RevOps teams",
      capability: "pipeline-aware automation and signal routing",
      stack: "a modern CRM (Salesforce or HubSpot) and a sales engagement tool",
      owner: "RevOps lead",
      painPoint: "stale account data and missed buying signals",
      from: "intent signal",
      to: "closed-won",
      diff: "an opinionated workflow layer instead of a generic builder",
    };
  }
  if (/(data|warehouse|snowflake|bigquery|etl|reverse etl|cdp)/.test(s)) {
    return {
      audience: "data and analytics teams",
      capability: "governed activation across the modern data stack",
      stack: "Snowflake, BigQuery, or Databricks with a downstream activation layer",
      owner: "analytics engineering or DataOps lead",
      painPoint: "fragmented activation surfaces and brittle pipelines",
      from: "warehouse model",
      to: "operational system",
      diff: "first-class governance and lineage on the activation path",
    };
  }
  if (/(security|iam|sso|identity|zero trust)/.test(s)) {
    return {
      audience: "security and IT teams",
      capability: "policy-driven access intelligence",
      stack: "an IdP (Okta/Azure AD) and a modern HRIS",
      owner: "IAM or SecOps lead",
      painPoint: "manual access reviews and audit gaps",
      from: "identity event",
      to: "compliant access state",
      diff: "continuous controls vs. point-in-time reviews",
    };
  }
  if (/(finance|fintech|billing|invoice|payment)/.test(s)) {
    return {
      audience: "finance and billing operations",
      capability: "automated revenue and billing reconciliation",
      stack: "an ERP/billing system and a modern CRM",
      owner: "RevOps or Controller",
      painPoint: "leaky revenue recognition and slow close cycles",
      from: "contract or invoice event",
      to: "GL-ready entry",
      diff: "depth in revenue contract logic, not just generic syncing",
    };
  }
  return {
    audience: "go-to-market and operations teams",
    capability: "workflow automation that adapts to context",
    stack: "a modern SaaS stack with at least one system of record",
    owner: "operations or platform lead",
    painPoint: "context-switching across point tools",
    from: "trigger event",
    to: "action taken",
    diff: "an opinionated, outcome-led experience",
  };
}

function guessArchetype(name: string, host: string): PartnerArchetype {
  const s = (name + " " + host).toLowerCase();
  if (/(reseller|msp|distributor|broker)/.test(s)) return "Platform";
  if (/(agency|consult|advisor|implementation)/.test(s)) return "Channel";
  if (/(referr|alliance|gtm|sales)/.test(s)) return "Go-To-Market";
  return "Data Affiliate";
}

function archetypeRationale(type: PartnerArchetype, name: string): string {
  const map: Record<PartnerArchetype, string> = {
    "Data Affiliate": `${name}'s value lands inside the product through a technical integration, driving stickiness and retention on mutual customers. Sales motion is integration-first, monetization typically via API fee.`,
    "Go-To-Market": `${name} has high-demand offerings that pair with ABC; the strongest motion is outbound referral. Value shows up as higher close rates and lower churn, monetized via revenue share.`,
    "Platform": `${name} is a natural extension of ABC and can be sold alongside it. Resell motion expands ACV/LTV; monetization is via margin / reseller economics.`,
    "Channel": `${name} reaches the same buyer as ABC and can drive inbound leads. Best modeled as a distribution partner, monetized on gross revenue.`,
  };
  return map[type];
}

// ---------- Internal awareness comm ----------

export async function generateInternalAwareness(
  partner: Partner,
): Promise<InternalAwareness> {
  const r = partner.research;
  if (!r) {
    return {
      subject: `New partner signed: ${partner.name}`,
      body: `We've signed ${partner.name}. Brief to follow.`,
    };
  }
  if (client) {
    try {
      const sys = `You are the Partnerships Comms AI for ABC Co. Draft a polished INTERNAL email announcing a newly signed partner. Return JSON with "subject" and "body". The body must be in markdown, ~200-280 words, with these sections in this order: Overview, Value Prop, Ideal Customer Profile, Partner Archetype, Scope, What to expect next. Tone: confident, succinct, internal. No emojis. No salesy hype.`;
      const usr = `Partner: ${partner.name}\nWebsite: ${partner.website}\nArchetype: ${r.archetype} — ${r.archetypeRationale}\nValue Prop: ${r.valueProp}\nICP: ${r.idealCustomerProfile}\nScope: ${r.scope}\nCompetitive context: ${r.competitiveLandscape}\nRisks: ${r.riskFlags.join("; ")}`;
      const raw = await complete(sys, usr, true);
      const parsed = JSON.parse(raw);
      return {
        subject: String(parsed.subject ?? `New partner signed: ${partner.name}`),
        body: String(parsed.body ?? ""),
      };
    } catch (err) {
      console.error("OpenAI internal awareness failed, falling back", err);
    }
  }
  return {
    subject: `[Partnerships] We've signed ${partner.name} — ${r.archetype}`,
    body: `## Overview
We've signed **${partner.name}** ([${safeHost(partner.website)}](${ensureUrl(partner.website)})) as a new ${r.archetype} partner. The integration moves into onboarding this week with primary contact **${partner.contact.name}** (${partner.contact.email}).

## Value Prop
${r.valueProp}

## Ideal Customer Profile
${r.idealCustomerProfile}

## Partner Archetype — ${r.archetype}
${r.archetypeRationale}

## Scope
${r.scope}

## What to expect next
- Partner-facing launch chat goes out today; we'll capture integration details, target launch date, and any partner-supplied collateral.
- The agent will follow up if the partner is unresponsive at 10 / 20 / 30 days and notify this team.
- Once the partner closes the chat, we'll publish a launch timeline with three communications (Coming Soon, Prepare for Launch, Live) plus customer-facing collateral.

Reply here with edits or call out blockers before we hit "Approve & Launch to Partner".`,
  };
}

function ensureUrl(s: string): string {
  return s.startsWith("http") ? s : `https://${s}`;
}

// ---------- Partner chat ----------

export interface PartnerChatPrompt {
  step:
    | "welcome"
    | "review-details"
    | "integration-details"
    | "target-date"
    | "summary"
    | "closed";
  message: string;
}

export async function partnerChatPrompt(args: {
  partner: Partner;
  step: PartnerChatPrompt["step"];
  lastPartnerMessage?: string;
}): Promise<string> {
  const { partner, step } = args;
  const r = partner.research!;
  switch (step) {
    case "welcome":
      return `Hi ${partner.contact.name.split(" ")[0]} 👋

I'm ABC's Partner Launch Agent. Congrats on signing with ABC — I'll help us go from "signed" to "live" cleanly.

Here's the brief our team put together about **${partner.name}** so far:

**Value Prop**
${r.valueProp}

**Ideal Customer Profile**
${r.idealCustomerProfile}

**Scope**
${r.scope}

Could you review the above and share anything you'd change, add, or want our team to know? Even a quick "looks good" is great.`;
    case "review-details":
      return `Thanks — got it. ✅

Next, can you walk me through the **integration**? A short description is perfect, and if you have an integration / API doc, please attach it. The more concrete, the faster we can build the joint go-to-market.

A few things that help:
- Which ABC surfaces / objects does it touch?
- Auth model (OAuth, API key, etc.)
- Any rate limits or environments (sandbox / prod) we should know about`;
    case "integration-details":
      return `Great — that gives me what I need to scope the launch.

What's a realistic **target integration completion date**? (You can give an exact date or a window — e.g. "early June" — and I'll work backward to build the launch timeline.)`;
    case "target-date":
      return `Locked in. Closing out this intake — give me a moment to summarize and hand back to the ABC partner team.`;
    case "summary":
      return summaryMessage(partner);
    case "closed":
      return `This intake is closed. The ABC partner team has everything they need and will reach out with the launch plan shortly. If anything changes on your side, reply here and I'll re-open the thread.`;
  }
}

function summaryMessage(p: Partner): string {
  const s = p.partnerChat?.partnerInputs;
  const r = p.research!;
  return `Here's what I've captured — please confirm or correct anything:

**Partner:** ${p.name}
**Primary contact:** ${p.contact.name} (${p.contact.email})

**Value Prop**
${r.valueProp}

**Ideal Customer Profile**
${r.idealCustomerProfile}

**Partner notes / edits**
${s?.reviewNotes?.trim() || "_(none)_"}

**Integration overview**
${s?.integrationDescription?.trim() || "_(none)_"}

**Target completion date**
${s?.targetDate ? humanDate(s.targetDate) : "_TBD_"}

If this all looks right, hit **Confirm & Close** below and I'll publish everything to the ABC partner team.`;
}

function humanDate(iso: string): string {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------- Launch timeline ----------

export async function generateLaunchTimeline(
  partner: Partner,
): Promise<LaunchTimeline> {
  const rawTarget = partner.partnerChat?.partnerInputs.targetDate;
  const target = resolveTargetDate(rawTarget);
  const targetISO = formatISO(target);

  const t = (offsetDaysBeforeLaunch: number) =>
    formatISO(addDays(target, -offsetDaysBeforeLaunch));

  const r = partner.research!;
  const integration =
    partner.partnerChat?.partnerInputs.integrationDescription ||
    "Integration details to be confirmed with partner.";

  return {
    targetDate: targetISO,
    milestones: [
      {
        name: "Kickoff & technical scoping",
        date: t(28),
        description:
          "Joint kickoff with ABC + partner eng. Lock down API surface, auth, environments.",
      },
      {
        name: "Build & sandbox certification",
        date: t(18),
        description:
          "Partner builds against sandbox; ABC certifies happy-path + edge cases.",
      },
      {
        name: "Beta with anchor customers",
        date: t(10),
        description:
          "2–3 anchor customers in beta. Capture quotes for launch comms.",
      },
      {
        name: "Launch readiness review",
        date: t(5),
        description:
          "Cross-functional review: Sales, CS, Marketing, Support. Go/no-go.",
      },
      {
        name: "Public launch",
        date: targetISO,
        description: "Integration live. Comms 3 sent.",
      },
    ],
    communications: [
      {
        id: "coming-soon",
        title: "Coming Soon",
        sendDate: t(21),
        status: "drafted",
        subject: `Coming soon: ${partner.name} × ABC`,
        body: comingSoonComm(partner, targetISO),
        attachments: ["Partner Brief (1-pager)", "Key dates"],
      },
      {
        id: "prepare-for-launch",
        title: "Prepare for Launch",
        sendDate: t(7),
        status: "drafted",
        subject: `Get ready: ${partner.name} × ABC launches ${humanDate(targetISO)}`,
        body: prepareForLaunchComm(partner, integration),
        attachments: [
          "Process Guide",
          "Integration Guide",
          "FAQ",
          "Internal Talk Tracks",
        ],
      },
      {
        id: "new-partner-live",
        title: "New Partner is Live",
        sendDate: targetISO,
        status: "drafted",
        subject: `${partner.name} × ABC is live`,
        body: liveComm(partner, r),
        attachments: [
          "Customer-facing PPT",
          "External One-Pager",
          "All internal templates",
        ],
      },
    ],
  };
}

function comingSoonComm(p: Partner, targetISO: string): string {
  const r = p.research!;
  return `## Coming soon: ${p.name} × ABC

We're a few weeks out from launching our integration with **${p.name}** (${r.archetype}). Here's the short version so you can start positioning it.

**Why it matters**
${r.valueProp}

**Who it's for**
${r.idealCustomerProfile}

**Key dates**
- Beta with anchor customers: see launch timeline
- Launch readiness review: see launch timeline
- Public launch: ${humanDate(targetISO)}

The full Prepare-for-Launch packet (process guide, integration guide, FAQ, internal talk tracks) drops one week out. Reply here with questions.`;
}

function resolveTargetDate(raw?: string): Date {
  const fallback = addDays(new Date(), 45);
  if (!raw || !raw.trim()) return fallback;
  const trimmed = raw.trim();
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  const months: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };
  const monthWord = `(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)`;
  const lower = trimmed.toLowerCase().replace(/(\d+)(st|nd|rd|th)\b/g, "$1");

  const monthFirst = lower.match(
    new RegExp(`\\b${monthWord}\\b[\\s.,]*?(\\d{1,2})?(?:[\\s.,]*(\\d{4}))?`),
  );
  const dayFirst = lower.match(
    new RegExp(`\\b(\\d{1,2})[\\s.,]+${monthWord}\\b(?:[\\s.,]*(\\d{4}))?`),
  );

  if (monthFirst || dayFirst) {
    const monthName = (dayFirst ? dayFirst[2] : monthFirst![1]) as string;
    const dayHint = dayFirst
      ? Number(dayFirst[1])
      : monthFirst![2]
        ? Number(monthFirst![2])
        : undefined;
    const yearStr = dayFirst ? dayFirst[3] : monthFirst![3];
    const m = months[monthName];
    const year = yearStr ? Number(yearStr) : new Date().getFullYear();
    const part = lower.match(/\b(early|mid|late|end of|beginning of)\b/);
    let day = dayHint ?? 15;
    if (!dayHint && part) {
      const kw = part[1];
      if (kw === "early" || kw === "beginning of") day = 5;
      else if (kw === "mid") day = 15;
      else day = 25;
    }
    const candidate = new Date(year, m, day);
    if (candidate.getTime() < Date.now()) candidate.setFullYear(year + 1);
    if (!Number.isNaN(candidate.getTime())) return candidate;
  }

  const qtr = lower.match(/\bq([1-4])\s*(\d{4})?/);
  if (qtr) {
    const q = Number(qtr[1]);
    const year = qtr[2] ? Number(qtr[2]) : new Date().getFullYear();
    return new Date(year, (q - 1) * 3 + 1, 15);
  }

  return fallback;
}

function prepareForLaunchComm(p: Partner, integration: string): string {
  return `## Prepare for launch: ${p.name} × ABC

We launch in one week. Use this packet to get fully ready.

**Integration overview (from partner)**
${integration}

**What's attached**
- Process Guide — how to position, qualify, and hand off
- Integration Guide — technical reference for solutions and support
- FAQ — top 10 questions with crisp answers
- Internal Talk Tracks — for AEs, CSMs, and support

**Action items**
- AEs: review the talk track and the ICP one-liner.
- CS: review the integration guide; flag accounts already asking for this.
- Support: scan the FAQ; ping us with anything unclear before launch day.

Questions? Reply here.`;
}

function liveComm(p: Partner, r: ResearchBrief): string {
  return `## ${p.name} × ABC is live

The integration is live as of today.

**The short pitch**
${r.valueProp}

**Resources (all in one place)**
- Customer-facing deck
- External one-pager
- All internal templates (process, integration, FAQ, talk tracks)

**Who to route to**
- Active opportunities: AEs can lead with the joint value prop on accounts that fit the ICP.
- Existing customers: CS team has a target list of accounts already showing intent signals.

We'll share a 30-day readout with metrics and customer stories. Until then — go sell it.`;
}

// ---------- 30-day metrics retro ----------

export async function generateMetricsNarrative(args: {
  partner: Partner;
  kpis: Record<string, string>;
  successStories: string;
}): Promise<MetricsRetro> {
  const { partner, kpis, successStories } = args;
  const r = partner.research!;

  let narrative = "";
  if (client) {
    try {
      const sys = `You are ABC's Partner Comms AI. Write a polished 30-day post-launch update email body in markdown. Sections: Headline, KPI Snapshot (as a markdown table), Customer Stories, What's Next. ~250 words. No emojis. Tone: confident, specific, internal+external-safe.`;
      const usr = `Partner: ${partner.name} (${r.archetype})\nValue Prop: ${r.valueProp}\nKPIs (key: value):\n${Object.entries(
        kpis,
      )
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")}\nSuccess stories:\n${successStories}`;
      narrative = await complete(sys, usr, false);
    } catch (err) {
      console.error("OpenAI metrics narrative failed, falling back", err);
    }
  }
  if (!narrative) narrative = mockMetricsNarrative(partner, kpis, successStories);

  return {
    submittedAt: new Date().toISOString(),
    kpis,
    successStories,
    generatedNarrative: narrative,
    archetypeSlide: archetypeSlide(r.archetype, partner),
  };
}

function mockMetricsNarrative(
  p: Partner,
  kpis: Record<string, string>,
  stories: string,
): string {
  const r = p.research!;
  const rows = Object.entries(kpis)
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join("\n");
  return `## ${p.name} × ABC — 30 day update

**Headline:** First 30 days of the ${p.name} integration are tracking ahead of expectations on the metrics that matter for a ${r.archetype} partner.

**KPI Snapshot**
| KPI | Value |
| --- | --- |
${rows}

**Customer Stories**
${stories.trim() || "_Add 2–3 quick customer wins here._"}

**What's Next**
- Double down on the segments where the integration is winning.
- Tighten the joint motion with ${p.name} on accounts already showing intent.
- Next checkpoint in 60 days with a full ARR and adoption readout.

Templates and updated collateral are attached.`;
}

export function archetypeSlide(
  archetype: PartnerArchetype,
  partner: Partner,
): string {
  const all = `## Partner Archetypes — where **${partner.name}** sits

Here's the lowdown: ABC's partner ecosystem breaks down into four archetypes — **Data Affiliate**, **Go-To-Market**, **Platform**, and **Channel**. Each has a distinct sales motion, value add, traits, KPIs, monetization model, and revenue potential. **${partner.name}** is a **${archetype}** partner.

### Summary by Partner Type

**Data Affiliate — integration-first partner.** Integrate with ABC to add value for mutual customers or broaden reach. Drives stickiness and reduces churn by embedding into the product. Heavy on technical integration and product-led value supporting customer workflow. Measured by product adoption and customer retention. Usually pays an API fee. Low-to-medium revenue potential, but by far the most common (~91% of partners).

**Go-To-Market — referral ally.** Companies with highly demanded products/services that help ABC close deals or retain customers. Sales motion is outbound referral. Boosts close rates and curbs churn. High customer demand, optional integration, sales-motion-dependent. KPIs focus on win rate and ARR. Revenue is shared. Medium-to-high revenue potential, ~5%.

**Platform — resell partner.** Their product is a natural extension of ABC's platform. ABC sells the offering directly. Expands LTV and ACV. Traits include strong reach or category leadership and bundling potential. KPIs target ARR expansion, ADS/attach rate, LTV. Monetized via margin or reseller. High revenue potential, ~3%.

**Channel — lead generator.** Same market and buyer as ABC, delivering inbound leads. Scales distribution and partner-sourced ARR, reduces CAC. Buyer alignment with ABC, reliance on the partner for leads. Monetized on gross revenue. Very high revenue potential, ~1%.

### Key Metrics

| Metric / Partner Type | Data Affiliate | Go-To-Market | Platform | Channel |
| --- | --- | --- | --- | --- |
| Sales Motion | n/a (integrated) | Outbound referral | Resell | Inbound lead |
| Value | Stickiness, lower churn | Higher close rate | Expand LTV/ACV | Scale distribution |
| Traits | Tech integration, product-led, workflow support | High demand, optional integration, sales-dependent | Strong reach, category leader, bundling | Buyer alignment, partner-led leads |
| Primary KPIs | Product adoption, retention | Win rate, ARR | ARR expansion, ADS/attach rate, LTV | Partner-sourced ARR, CAC reduction |
| Monetization Model | API fee | Revenue share | Margin / reseller | Gross revenue |
| Revenue Potential | Low-medium | Medium-high | High | Very high |
| % of Partners | ~91% | ~5% | ~3% | ~1% |

If you need to map these to specific partner candidates or want more details, just let me know.`;
  return all;
}
