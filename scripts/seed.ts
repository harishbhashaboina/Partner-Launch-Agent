// Seeds the store with sample partners across stages so the demo looks alive.
import { promises as fs } from "fs";
import path from "path";
import type { Partner, Store } from "../src/lib/types";
import {
  formatIntakeQuestionMessage,
  loadFlatIntakeQuestions,
} from "../src/lib/partner-intake-questions";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

function iso(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function p1(): Partner {
  return {
    id: "demo-loop-data",
    name: "Loop Data",
    website: "loopdata.io",
    contact: { name: "Priya Shah", email: "priya@loopdata.io" },
    createdAt: iso(2),
    updatedAt: iso(0),
    stage: "internal-review",
    followUps: [],
    research: {
      valueProp:
        "Loop Data turns warehouse models into governed activation surfaces. Joint with ABC, customers move from a Snowflake or BigQuery model to a live workflow inside ABC without brittle reverse-ETL — cutting time-to-activation from weeks to hours.",
      idealCustomerProfile:
        "Mid-market data and revenue teams (300–3,000 employees) running Snowflake/BigQuery with a downstream activation gap. Strong fit when there's an analytics engineer in seat and at least one revenue system already integrated with ABC.",
      archetype: "Data Affiliate",
      archetypeRationale:
        "Loop Data's value lands inside ABC through a technical integration. Sales motion is integration-first, monetization typically via API fee, primary KPI is product adoption and retention.",
      scope:
        "Phase 1 (60 days): production-grade Loop ↔ ABC integration, joint landing page, one anchor customer reference. Phase 2: in-product cross-promotion + quarterly business reviews.",
      competitiveLandscape:
        "Sits alongside generic reverse-ETL tools but wins on governance and lineage on the activation path. Few competitors integrate this tightly into ABC.",
      riskFlags: ["Security review needed for warehouse credentials"],
    },
    internalAwareness: {
      subject: "[Partnerships] We've signed Loop Data — Data Affiliate",
      body: `## Overview
We've signed **Loop Data** ([loopdata.io](https://loopdata.io)) as a new Data Affiliate partner. The integration moves into onboarding this week with primary contact **Priya Shah** (priya@loopdata.io).

## Value Prop
Loop Data turns warehouse models into governed activation surfaces. Joint with ABC, customers move from a Snowflake/BigQuery model to a live workflow inside ABC without brittle reverse-ETL.

## Ideal Customer Profile
Mid-market data and revenue teams (300–3,000 employees) on Snowflake/BigQuery with a downstream activation gap.

## Partner Archetype — Data Affiliate
Loop Data's value lands inside ABC through a technical integration. Integration-first sales motion. Monetization via API fee.

## Scope
Phase 1 (60 days): production-grade integration, joint landing page, one anchor reference. Phase 2: in-product cross-promotion + QBRs.

## What to expect next
- Partner-facing launch chat goes out today.
- The agent will follow up if the partner is unresponsive at 10/20/30 days.
- Once intake closes, we'll publish a launch timeline with three communications.

Reply here with edits or call out blockers before we hit "Approve & Launch to Partner".`,
    },
  };
}

function p2(flat: import("../src/lib/partner-intake-questions").FlatIntakeQuestion[]): Partner {
  const welcome = `Hi Marcus 👋

I'm ABC's Partner Launch Agent. Congrats on signing with ABC.

We'll capture your **Partner Launch Intake** here so we can fill the launch templates (Partner Data Brief, Integration Guide, decks, and FAQs) for your team.

Take your time — you can attach files where helpful (logos, one-pagers, etc.).`;
  return {
    id: "demo-northbeam",
    name: "Northbeam Advisors",
    website: "northbeam.co",
    contact: { name: "Marcus Reed", email: "marcus@northbeam.co" },
    createdAt: iso(14),
    updatedAt: iso(1),
    stage: "partner-chat",
    followUps: [],
    research: {
      valueProp:
        "Northbeam is a fast-growing GTM advisory shop that lands ABC inside mid-market deals via outbound referral. Their team brings warm intros and senior-level relationships across the revenue stack.",
      idealCustomerProfile:
        "Mid-market companies (500–5,000 employees) actively re-platforming their revenue stack, where Northbeam is already advising on tooling decisions.",
      archetype: "Go-To-Market",
      archetypeRationale:
        "Northbeam's strongest motion is outbound referral. Value: higher close rates and lower churn. Revenue share monetization.",
      scope:
        "Phase 1: 5 anchor referrals in 60 days + co-branded one-pager. Phase 2: shared QBR cadence + jointly run executive briefings.",
      competitiveLandscape:
        "Competing advisory shops exist, but Northbeam's tight integration into ABC's deal cycle differentiates.",
      riskFlags: ["Referral attribution flow not yet wired"],
    },
    internalAwareness: {
      subject: "[Partnerships] We've signed Northbeam Advisors — Go-To-Market",
      body: `## Overview
Northbeam Advisors is signed as a Go-To-Market partner. Outbound referral motion, contact: Marcus Reed.

## Value Prop
Warm-intro firepower into mid-market revenue stack re-platform deals.

## Ideal Customer Profile
500–5,000 employee companies in re-platform mode that Northbeam already advises.

## Partner Archetype — Go-To-Market
Outbound referral, revenue share monetization, primary KPI: win rate and ARR.

## Scope
5 anchor referrals in 60 days + co-branded one-pager.

## What to expect next
Partner-facing chat going out today; we'll set a target launch date and confirm the attribution flow.`,
      approvedAt: iso(10),
    },
    partnerChat: {
      token: "demo-northbeam-token",
      step: "intake",
      intakeIndex: 2,
      intakeAnswers: {
        [flat[0].id]: "Northbeam Advisors",
        [flat[1].id]:
          "Fast-growing GTM advisory shop that lands ABC inside mid-market deals via outbound referral.",
      },
      attachments: [],
      partnerInputs: {},
      lastPartnerResponseAt: iso(1),
      messages: [
        {
          id: "m1",
          role: "agent",
          ts: iso(2),
          content: `${welcome}\n\n${formatIntakeQuestionMessage(flat[0], 0, flat.length)}`,
          meta: { step: "intake" },
        },
        {
          id: "m2",
          role: "partner",
          ts: iso(1),
          content: "Northbeam Advisors",
          meta: { step: "intake" },
        },
        {
          id: "m3",
          role: "agent",
          ts: iso(1),
          content: formatIntakeQuestionMessage(flat[1], 1, flat.length),
          meta: { step: "intake" },
        },
        {
          id: "m4",
          role: "partner",
          ts: iso(1),
          content:
            "Fast-growing GTM advisory shop that lands ABC inside mid-market deals via outbound referral.",
          meta: { step: "intake" },
        },
        {
          id: "m5",
          role: "agent",
          ts: iso(1),
          content: formatIntakeQuestionMessage(flat[2], 2, flat.length),
          meta: { step: "intake" },
        },
      ],
    },
  };
}

function p3(): Partner {
  const target = new Date();
  target.setDate(target.getDate() + 21);
  return {
    id: "demo-helix-platform",
    name: "Helix Platform",
    website: "helixplatform.com",
    contact: { name: "Avery Chen", email: "avery@helixplatform.com" },
    createdAt: iso(40),
    updatedAt: iso(2),
    stage: "launching",
    followUps: [],
    research: {
      valueProp:
        "Helix is a natural extension of ABC's platform, bundling identity + access intelligence on top of ABC. Sold together, joint customers consolidate two budget lines.",
      idealCustomerProfile:
        "Upper-mid-market and enterprise security teams (2,000+ employees) already standardized on a modern IdP, with mature audit programs.",
      archetype: "Platform",
      archetypeRationale:
        "Helix is sold alongside ABC. Resell motion expands ACV/LTV. Monetization via margin / reseller economics.",
      scope:
        "Phase 1: 3 lighthouse joint sells in 90 days. Phase 2: SKU bundling in ABC's reseller catalog.",
      competitiveLandscape:
        "Adjacent vendors exist but Helix's depth in access intelligence is differentiated.",
      riskFlags: [],
    },
    internalAwareness: {
      subject: "[Partnerships] We've signed Helix Platform — Platform",
      body: `## Overview
Helix Platform is signed as a Platform partner — resell motion.

## Value Prop
Bundle ABC with Helix's access intelligence layer for consolidated security spend.

## Ideal Customer Profile
2,000+ employee security teams on a modern IdP with mature audit programs.

## Partner Archetype — Platform
Resell motion. Monetization: margin/reseller. KPIs: ARR expansion, ADS/attach rate, LTV.

## Scope
Phase 1: 3 lighthouse joint sells in 90 days. Phase 2: bundling in reseller catalog.

## What to expect next
Launch timeline + 3 launch communications in motion.`,
      approvedAt: iso(38),
    },
    partnerChat: {
      token: "demo-helix-token",
      step: "closed",
      intakeIndex: 0,
      intakeAnswers: {},
      attachments: [
        {
          id: "att1",
          name: "Helix-ABC-Integration-Spec.md",
          size: 14820,
          mimeType: "text/markdown",
          uploadedAt: iso(10),
          excerpt:
            "# Helix x ABC Integration\n\nAuth: OAuth2 with PKCE. Token exchange via /oauth/token...",
        },
      ],
      partnerInputs: {
        reviewNotes: "All looks right.",
        integrationDescription:
          "OAuth2 PKCE auth flow, REST API on top of Helix's policy engine. Read-only initially; write-back behind feature flag for v1.1.",
        targetDate: target.toISOString(),
      },
      lastPartnerResponseAt: iso(8),
      messages: [],
    },
    summary: {
      finalizedAt: iso(8),
      valueProp:
        "Helix is a natural extension of ABC's platform, bundling identity + access intelligence on top of ABC.",
      idealCustomerProfile:
        "Upper-mid-market and enterprise security teams (2,000+ employees).",
      scope:
        "Phase 1: 3 lighthouse joint sells in 90 days. Phase 2: SKU bundling.",
      integrationOverview:
        "OAuth2 PKCE auth flow, REST API on top of Helix's policy engine. Read-only initially; write-back behind feature flag for v1.1.",
      targetDate: target.toISOString(),
      partnerNotes: "All looks right.",
    },
    timeline: {
      targetDate: target.toISOString(),
      milestones: [
        {
          name: "Kickoff & technical scoping",
          date: addDays(target, -28),
          description: "Joint kickoff. Lock down API surface, auth, environments.",
        },
        {
          name: "Build & sandbox certification",
          date: addDays(target, -18),
          description: "Helix builds against sandbox; ABC certifies.",
        },
        {
          name: "Beta with anchor customers",
          date: addDays(target, -10),
          description: "3 anchor customers in beta.",
        },
        {
          name: "Launch readiness review",
          date: addDays(target, -5),
          description: "Cross-functional go/no-go.",
        },
        {
          name: "Public launch",
          date: target.toISOString(),
          description: "Integration live. Comms 3 sent.",
        },
      ],
      communications: [
        {
          id: "coming-soon",
          title: "Coming Soon",
          sendDate: addDays(target, -21),
          status: "sent",
          subject: "Coming soon: Helix Platform × ABC",
          body: "Coming soon comm…",
          attachments: ["Partner Brief", "Key dates"],
        },
        {
          id: "prepare-for-launch",
          title: "Prepare for Launch",
          sendDate: addDays(target, -7),
          status: "drafted",
          subject: "Get ready: Helix Platform × ABC launches soon",
          body: "Prepare for launch comm…",
          attachments: ["Process Guide", "Integration Guide", "FAQ", "Talk Tracks"],
        },
        {
          id: "new-partner-live",
          title: "New Partner is Live",
          sendDate: target.toISOString(),
          status: "drafted",
          subject: "Helix Platform × ABC is live",
          body: "Live comm…",
          attachments: ["Customer PPT", "One-pager", "Templates"],
        },
      ],
    },
  };
}

function addDays(d: Date, days: number): string {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n.toISOString();
}

function p4(flat: import("../src/lib/partner-intake-questions").FlatIntakeQuestion[]): Partner {
  const welcome = `Hi Sam 👋

I'm ABC's Partner Launch Agent. Congrats on signing with ABC.

We'll capture your **Partner Launch Intake** here so we can fill the launch templates (Partner Data Brief, Integration Guide, decks, and FAQs) for your team.

Take your time — you can attach files where helpful (logos, one-pagers, etc.).`;
  return {
    id: "demo-quietchannel",
    name: "QuietChannel",
    website: "quietchannel.com",
    contact: { name: "Sam Patel", email: "sam@quietchannel.com" },
    createdAt: iso(45),
    updatedAt: iso(35),
    stage: "partner-chat",
    followUps: [],
    research: {
      valueProp:
        "QuietChannel is a developer-tooling vendor whose users overlap heavily with ABC's ICP. Joint go-to-market drives inbound leads from QuietChannel into ABC.",
      idealCustomerProfile:
        "Series B–D companies (100–800 employees) standardizing on modern developer infra.",
      archetype: "Channel",
      archetypeRationale:
        "QuietChannel reaches the same buyer and drives inbound leads. Monetized on gross revenue.",
      scope: "Co-marketing + inbound lead routing in Phase 1.",
      competitiveLandscape: "Unique niche; few direct competitors.",
      riskFlags: ["Partner hasn't replied to intake in 5 weeks"],
    },
    internalAwareness: {
      subject: "[Partnerships] We've signed QuietChannel — Channel",
      body: `## Overview\nQuietChannel signed as a Channel partner.`,
      approvedAt: iso(40),
    },
    partnerChat: {
      token: "demo-quietchannel-token",
      step: "intake",
      intakeIndex: 0,
      intakeAnswers: {},
      attachments: [],
      partnerInputs: {},
      lastPartnerResponseAt: undefined,
      messages: [
        {
          id: "m1",
          role: "agent",
          ts: iso(35),
          content: `${welcome}\n\n${formatIntakeQuestionMessage(flat[0], 0, flat.length)}`,
          meta: { step: "intake" },
        },
      ],
    },
  };
}

async function main() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const flat = await loadFlatIntakeQuestions();
  const store: Store = {
    partners: {},
    order: [],
  };
  for (const p of [p1(), p2(flat), p3(), p4(flat)]) {
    store.partners[p.id] = p;
    store.order.push(p.id);
  }
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  console.log("Seeded", Object.keys(store.partners).length, "partners.");
  console.log("Demo partner chat tokens:");
  console.log("  /partner-chat/demo-northbeam-token");
  console.log("  /partner-chat/demo-helix-token");
  console.log("  /partner-chat/demo-quietchannel-token");
}

main();
