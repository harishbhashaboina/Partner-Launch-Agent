/**
 * Generates a full launch pack using synthetic intake answers.
 *
 * Usage:
 *   npm run generate:test-partner                 # has_integration = Yes → folder: generated/test user1/
 *   npm run generate:test-partner:no-integration   # has_integration = No (no Integration Guide)
 *
 * Or: tsx scripts/generate-test-partner-pack.ts --no-integration
 */
import type { Partner } from "../src/lib/types";
import { writePartnerGeneratedPack } from "../src/lib/partner-output";

const ABC_TO_PARTNER = "ABC \u2192 Partner";
const PARTNER_TO_ABC = "Partner \u2192 ABC";

function isoNow(): string {
  return new Date().toISOString();
}

function buildFixtureIntake(
  includeIntegration: boolean,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    partner_name: includeIntegration
      ? "test user1"
      : "test partner no integration",
    partner_one_liner: includeIntegration
      ? "Synthetic test partner: validates Partner Data Brief, Integration Guide, FAQ, and Process Guide fills end-to-end."
      : "Synthetic fixture: referral / GTM partner with **no product integration** — Integration Guide should be omitted from the pack.",
    partnership_type: "Referral",
    launch_date: "2026-06-15",
    partner_logo: "https://example.com/logos/test-partner.svg",
    abc_products: '["Ignite","GloFox","Trainerize"]',
    customer_segments: '["Gym","Studio"]',
    sub_segments: "MML (2–40 locations)",
    geographies: '["US","Canada"]',
    other_geography: "",
    operator_value:
      "TEST: Removes duplicate member data entry, automates billing reconciliation, and gives owners a single dashboard for attendance and payments.",
    member_value:
      "TEST: Members get one app for check-in, class booking, and payment history with fewer failed renewals.",
    pain_points:
      "- Manual CSV exports every night\n- Members complain about double charges\n- Staff re-key leads from partner portal\n- No visibility when sync stalls",
    not_a_fit:
      "TEST: Single-location boutiques without POS API access, or operators who require fully offline-only workflows.",
    ideal_customer_profile:
      "TEST: Regional gym groups (5–25 sites), 5k–50k members, modern POS, dedicated ops manager, US/Canada.",
    pricing_model:
      "TEST: Per-active-member monthly platform fee plus implementation flat fee; volume tiers after 25k members.",
    abc_discounts: "TEST: 15% partner discount on Ignite bundle for first contract year.",
    commission_model: "TEST: 12% recurring on net new ARR attributed in CRM.",
    upsell_cross_sell:
      "TEST: Trainerize add-on, GymSales pipeline pack, and Evo analytics uplift on renewal.",
    has_integration: includeIntegration ? "Yes" : "No",

    activation_process:
      "TEST: Kickoff call → joint enablement sessions → 30-day check-ins (no connector — referral motion only when no integration).",
    "responsibility_matrix.abc_owns":
      "TEST: CRM routing, contract paperwork, tier-1 member billing disputes.",
    "responsibility_matrix.partner_owns":
      "TEST: Partner sales engineering for scoping, training webinars, and co-marketing assets.",
    "responsibility_matrix.customer_owns":
      "TEST: Staff training, member communications, and on-site operations.",

    onboarding_timeline: "TEST: Typical onboarding 2 weeks from kickoff.",
    sales_motion: "Referral",
    referral_process:
      "TEST: Rep submits SFDC referral → partner AE accepts within 24h → joint discovery → pilot scope doc.",
    post_referral_journey:
      "TEST: Partner success manager assigned; weekly steering until first live referral.",
    referral_tracking:
      "TEST: Salesforce referral object + partner portal deep link with status milestones.",

    sales_materials__0__material_name: "TEST: Joint value one-pager",
    sales_materials__0__material_type: "One-pager",
    sales_materials__0__material_link: "https://example.com/materials/test-partner-onepager.pdf",

    support_ticket_process:
      "TEST: Log under Product=Partnerships, Type=Referral, include opportunity ID and partner deal registration ID.",

    contacts: [
      "ABC Partner Mgr | Alex Agent | Director, Partnerships | alex.agent@abc.example.com | @alex-abc",
      "Partner SE | Blake Builder | Solutions Engineer | blake@test-partner.example.com | +1-555-0100",
      "Partner CS | Casey Care | Head of Support | casey@test-partner.example.com | @casey-partner",
    ].join("\n"),

    social_proof:
      'TEST: "We cut reconciliation time by 6 hours a week." — COO, Regional Fitness Group (pilot).',
  };

  if (!includeIntegration) {
    return base;
  }

  return {
    ...base,
    integration_name: "TEST Partner Core API v2",
    target_go_live_date: "2026-07-01",
    integrated_products: "Ignite, GloFox",
    customer_facing_workflow:
      "TEST paragraph A: Member signs in app; identity syncs to partner within 60s.\n\nTEST paragraph B: Purchases and attendance post to partner webhooks nightly plus on-demand refresh.\n\nTEST paragraph C: Support sees linked tickets in ABC when partner flags a member issue.",
    setup_model: "Partner-Assisted",
    integration_support_contact: "integrations@test-partner.example.com",

    prerequisites__0__requirement: "TEST: API credentials provisioned",
    prerequisites__0__details: "TEST: Sandbox + production keys in vault; IP allowlist submitted.",
    prerequisites__0__owner: "Partner",
    prerequisites__1__requirement: "TEST: Brand assets",
    prerequisites__1__details: "TEST: Logo pack and color tokens for co-branded emails.",
    prerequisites__1__owner: "Partner",
    prerequisites__2__requirement: "TEST: Salesforce routing",
    prerequisites__2__details: "TEST: Queue ID and case record type for escalations.",
    prerequisites__2__owner: "ABC",
    prerequisites__3__requirement: "TEST: Pilot site selected",
    prerequisites__3__details: "TEST: Two corporate-owned gyms for UAT.",
    prerequisites__3__owner: "Customer",

    data_exchange__0__direction: ABC_TO_PARTNER,
    data_exchange__0__field_name: "TEST: Member profile + active membership status",
    data_exchange__0__data_type: "JSON snapshot",
    data_exchange__0__trigger_frequency: "On member create/update + hourly delta",
    data_exchange__0__notes_conditions: "TEST: PII minimized; phone hashed at edge.",

    data_exchange__1__direction: PARTNER_TO_ABC,
    data_exchange__1__field_name: "TEST: Payment outcome + invoice references",
    data_exchange__1__data_type: "Webhook payload",
    data_exchange__1__trigger_frequency: "Real-time",
    data_exchange__1__notes_conditions: "TEST: Retries with idempotency keys for 24h.",

    known_limitations__0__limitation: "TEST: US/Canada only for phase 1",
    known_limitations__0__impact: "TEST: LatAm clubs deferred to roadmap Q4.",
    known_limitations__0__workaround: "TEST: Manual CSV export for non-US sites.",
    known_limitations__1__limitation: "TEST: Historical backfill capped at 18 months",
    known_limitations__1__impact: "TEST: Older invoices stay in legacy archive.",
    known_limitations__1__workaround: "TEST: One-time bulk import project ($fee).",
    known_limitations__2__limitation: "TEST: Rate limit 600 rpm per tenant",
    known_limitations__2__impact: "TEST: Large batch jobs must be chunked.",
    known_limitations__2__workaround: "TEST: Partner provides job scheduler windows.",

    common_errors__0__error_symptom: "TEST: 401 on webhook delivery",
    common_errors__0__likely_cause: "TEST: Rotated secret not updated in ABC vault.",
    common_errors__0__first_responder: "Partner",
    common_errors__0__resolution_steps:
      "TEST: Re-save credentials in admin UI, replay failed events from partner dashboard.",
    common_errors__1__error_symptom: "TEST: Duplicate member records",
    common_errors__1__likely_cause: "TEST: Email casing mismatch across systems.",
    common_errors__1__first_responder: "ABC",
    common_errors__1__resolution_steps:
      "TEST: Merge workflow in ABC + disable secondary email alias mapping.",
    common_errors__2__error_symptom: "TEST: Stale class roster counts",
    common_errors__2__likely_cause: "TEST: Clock skew on nightly batch.",
    common_errors__2__first_responder: "Partner",
    common_errors__2__resolution_steps: "TEST: Enable NTP on connector VM; rerun sync job.",
    common_errors__3__error_symptom: "TEST: Timeout on bulk export",
    common_errors__3__likely_cause: "TEST: Payload > 50MB without pagination.",
    common_errors__3__first_responder: "Customer",
    common_errors__3__resolution_steps: "TEST: Split export by location; use async job API.",
  };
}

function stubPartner(includeIntegration: boolean): Partner {
  const name = includeIntegration ? "test user1" : "test partner no integration";
  return {
    id: includeIntegration ? "fixture-test-user1" : "fixture-test-partner-no-ig",
    name,
    website: "https://test-partner.example.com",
    contact: { name: "Fixture Bot", email: "fixture@test-partner.example.com" },
    createdAt: isoNow(),
    updatedAt: isoNow(),
    stage: "summarized",
    followUps: [],
  };
}

async function main(): Promise<void> {
  const noIg = process.argv.includes("--no-integration");
  const intakeAnswers = buildFixtureIntake(!noIg);
  const { folder, files } = await writePartnerGeneratedPack({
    partner: stubPartner(!noIg),
    intakeAnswers,
  });
  console.log(noIg ? "Mode: has_integration = No\n" : "Mode: has_integration = Yes\n");
  console.log("Generated pack at:", folder);
  console.log("Files (" + files.length + "):", files.join(", "));
  if (noIg && files.some((f) => f.includes("Integration Guide"))) {
    console.error("ERROR: Integration Guide was generated but should be skipped.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
