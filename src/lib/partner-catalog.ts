import fs from "node:fs/promises";
import path from "node:path";

export interface CatalogPartner {
  id: string;
  folder: string;
  name: string;
  website: string;
  oneLiner: string;
  archetype: string;
  partnershipType: string;
  launchDate: string;
  abcProducts: string;
  segment: string;
  subSegment: string;
  geography: string;
  operatorValue: string;
  memberValue: string;
  painPoints: string;
  qualifyingCriteria: string;
  knockOuts: string;
  icpNotes: string;
  pricing: string;
  discounts: string;
  commission: string;
  integrationName: string;
  goLiveDate: string;
  setupModel: string;
  customerFacingDescription: string;
  prerequisites: string;
  dataAbcToPartner: string;
  dataPartnerToAbc: string;
  limitations: string;
  errors: string;
  supportEmail: string;
  activationProcess: string;
  activationOwnership: string;
  postReferral: string;
  supportTicket: string;
  primaryContact: string;
  escalationContact: string;
  customerQuote: string;
  valueProp: string;
  idealCustomerProfile: string;
  scope: string;
  competitiveLandscape: string;
  contact: { name: string; email: string };
  searchBlob: string;
}

interface CatalogCache {
  partners: CatalogPartner[];
  loadedAt: number;
  dirMtimeMs: number;
}

let cache: CatalogCache | null = null;

const DEFAULT_DIR = "/Users/harishbhashaboina/Desktop/hackathon/Partner-Launch-Agent/generated";
const DEFAULT_BRIEF_FILENAME = "intake-expanded.json";

export function partnerTemplatesDir(): string {
  return process.env.PARTNER_TEMPLATES_DIR || DEFAULT_DIR;
}

export function partnerBriefFilename(): string {
  return process.env.PARTNER_BRIEF_FILENAME || DEFAULT_BRIEF_FILENAME;
}

export async function loadPartnerCatalog(): Promise<CatalogPartner[]> {
  const dir = partnerTemplatesDir();
  let dirStat;
  try {
    dirStat = await fs.stat(dir);
  } catch {
    return [];
  }

  if (
    cache &&
    cache.dirMtimeMs === dirStat.mtimeMs &&
    Date.now() - cache.loadedAt < 60_000
  ) {
    return cache.partners;
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const partners: CatalogPartner[] = [];
  const briefFilename = partnerBriefFilename();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folder = path.join(dir, entry.name);
    const briefPath = path.join(folder, briefFilename);
    let raw: string;
    try {
      raw = await fs.readFile(briefPath, "utf8");
    } catch {
      continue;
    }
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      continue;
    }
    const normalized = normalize(entry.name, folder, json);
    if (normalized) partners.push(normalized);
  }

  partners.sort((a, b) => a.name.localeCompare(b.name));
  cache = {
    partners,
    loadedAt: Date.now(),
    dirMtimeMs: dirStat.mtimeMs,
  };
  return partners;
}

function asStr(v: unknown): string {
  return String(v ?? "").trim();
}

/** Nested `briefData` / camelCase (agent) vs flat snake_case from `intake-expanded.json`. */
function pickBrief(
  brief: Record<string, unknown>,
  json: Record<string, unknown>,
  briefKey: string,
  ...flatKeys: string[]
): string {
  const fromBrief = asStr(brief?.[briefKey]);
  if (fromBrief) return fromBrief;
  for (const k of flatKeys) {
    const v = asStr(json?.[k]);
    if (v) return v;
  }
  return "";
}

function pickResearch(
  research: Record<string, unknown>,
  json: Record<string, unknown>,
  researchKey: string,
  ...flatKeys: string[]
): string {
  const fromR = asStr(research?.[researchKey]);
  if (fromR) return fromR;
  for (const k of flatKeys) {
    const v = asStr(json?.[k]);
    if (v) return v;
  }
  return "";
}

function collectIndexedLines(
  json: Record<string, unknown>,
  prefix: string,
  field: string,
  maxRows = 24,
): string[] {
  const lines: string[] = [];
  for (let i = 0; i < maxRows; i++) {
    const line = asStr(json[`${prefix}${i}__${field}`]);
    if (!line) {
      if (i === 0) continue;
      break;
    }
    lines.push(line);
  }
  return lines;
}

function painPointsFromJson(json: Record<string, unknown>): string {
  const blob = asStr(json.pain_points);
  if (blob) return blob;
  return collectIndexedLines(json, "pain_points__", "pain_point").join("\n");
}

function prerequisitesFromJson(json: Record<string, unknown>): string {
  const blob = asStr(json.prerequisites);
  if (blob) return blob;
  const blocks: string[] = [];
  for (let i = 0; i < 12; i++) {
    const req = asStr(json[`prerequisites__${i}__requirement`]);
    const det = asStr(json[`prerequisites__${i}__details`]);
    const own = asStr(json[`prerequisites__${i}__owner`]);
    if (!req && !det && !own) {
      if (i === 0) continue;
      break;
    }
    blocks.push([req, det, own].filter(Boolean).join(" — "));
  }
  return blocks.join("\n");
}

function limitationsFromJson(json: Record<string, unknown>): string {
  const blob = asStr(json.known_limitations);
  if (blob) return blob;
  const blocks: string[] = [];
  for (let i = 0; i < 12; i++) {
    const lim = asStr(json[`known_limitations__${i}__limitation`]);
    const imp = asStr(json[`known_limitations__${i}__impact`]);
    const work = asStr(json[`known_limitations__${i}__workaround`]);
    if (!lim && !imp && !work) {
      if (i === 0) continue;
      break;
    }
    blocks.push([lim, imp, work].filter(Boolean).join(" — "));
  }
  return blocks.join("\n");
}

function errorsFromJson(json: Record<string, unknown>): string {
  const blob = asStr(json.common_errors);
  if (blob) return blob;
  const blocks: string[] = [];
  for (let i = 0; i < 12; i++) {
    const sym = asStr(json[`common_errors__${i}__error_symptom`]);
    const cause = asStr(json[`common_errors__${i}__likely_cause`]);
    const fix = asStr(json[`common_errors__${i}__resolution_steps`]);
    if (!sym && !cause && !fix) {
      if (i === 0) continue;
      break;
    }
    blocks.push([sym, cause, fix].filter(Boolean).join(" — "));
  }
  return blocks.join("\n");
}

function isAbcToPartnerDirection(dir: string): boolean {
  const d = dir.toLowerCase();
  if (/\babc\s+to\s+partner\b/.test(d)) return true;
  const ia = d.indexOf("abc");
  const ip = d.indexOf("partner");
  if (ia !== -1 && ip !== -1 && ia < ip) return true;
  return false;
}

function isPartnerToAbcDirection(dir: string): boolean {
  const d = dir.toLowerCase();
  if (/\bpartner\s+to\s+abc\b/.test(d)) return true;
  const ia = d.indexOf("abc");
  const ip = d.indexOf("partner");
  if (ia !== -1 && ip !== -1 && ip < ia) return true;
  return false;
}

function dataExchangeFromJson(json: Record<string, unknown>): {
  toPartner: string;
  toAbc: string;
} {
  const toPartner: string[] = [];
  const toAbc: string[] = [];
  for (let i = 0; i < 16; i++) {
    const dir = asStr(json[`data_exchange__${i}__direction`]);
    if (!dir) {
      if (i === 0) continue;
      break;
    }
    const field = asStr(json[`data_exchange__${i}__field_name`]);
    const dtype = asStr(json[`data_exchange__${i}__data_type`]);
    const freq = asStr(json[`data_exchange__${i}__trigger_frequency`]);
    const notes = asStr(json[`data_exchange__${i}__notes_conditions`]);
    const line = [field, dtype, freq, notes].filter(Boolean).join("; ");
    if (isAbcToPartnerDirection(dir)) {
      toPartner.push(line || dir);
    } else if (isPartnerToAbcDirection(dir)) {
      toAbc.push(line || dir);
    } else {
      toPartner.push(`${dir}: ${line}`.trim());
    }
  }
  return { toPartner: toPartner.join("\n"), toAbc: toAbc.join("\n") };
}

function contactsBlockFromJson(json: Record<string, unknown>): string {
  const blob = asStr(json.contacts);
  if (blob) return blob;
  const lines: string[] = [];
  for (let i = 0; i < 16; i++) {
    const typ = asStr(json[`contacts__${i}__contact_type`]);
    const nm = asStr(json[`contacts__${i}__name`]);
    const title = asStr(json[`contacts__${i}__title`]);
    const email = asStr(json[`contacts__${i}__email`]);
    const phone = asStr(json[`contacts__${i}__phone_or_slack`]);
    if (!typ && !nm && !email) {
      if (i === 0) continue;
      break;
    }
    lines.push([typ, nm, title, email, phone].filter(Boolean).join(" | "));
  }
  return lines.join("\n");
}

function escalationFromContacts(json: Record<string, unknown>): string {
  const line1 = [
    asStr(json[`contacts__1__contact_type`]),
    asStr(json[`contacts__1__name`]),
    asStr(json[`contacts__1__title`]),
    asStr(json[`contacts__1__email`]),
    asStr(json[`contacts__1__phone_or_slack`]),
  ]
    .filter(Boolean)
    .join(" | ");
  return line1;
}

function responsibilityMatrixFromJson(json: Record<string, unknown>): string {
  const a = asStr(json["responsibility_matrix.abc_owns"]);
  const p = asStr(json["responsibility_matrix.partner_owns"]);
  const c = asStr(json["responsibility_matrix.customer_owns"]);
  const parts: string[] = [];
  if (a) parts.push(`ABC owns: ${a}`);
  if (p) parts.push(`Partner owns: ${p}`);
  if (c) parts.push(`Customer owns: ${c}`);
  return parts.join("\n");
}

function normalize(
  folderName: string,
  folderPath: string,
  json: any,
): CatalogPartner | null {
  const research = (json?.research ?? {}) as Record<string, unknown>;
  const brief = (json?.briefData ?? {}) as Record<string, unknown>;
  const flat = json as Record<string, unknown>;

  const name =
    asStr(json?.partnerName) ||
    asStr(json?.partner_name) ||
    folderName.trim();
  if (!name) return null;

  const dx = dataExchangeFromJson(flat);
  const contactsBlock = contactsBlockFromJson(flat);
  const primaryContact =
    pickBrief(brief, flat, "primaryContact", "contacts") || contactsBlock;

  const partner: CatalogPartner = {
    id: asStr(json?.partnerId) || asStr(json?.partner_id) || folderName,
    folder: folderPath,
    name,
    website: asStr(json?.website),
    oneLiner: pickBrief(brief, flat, "oneLiner", "partner_one_liner"),
    archetype:
      asStr(research?.archetype) ||
      pickBrief(brief, flat, "partnershipType", "partnership_type"),
    partnershipType: pickBrief(
      brief,
      flat,
      "partnershipType",
      "partnership_type",
    ),
    launchDate: pickBrief(brief, flat, "launchDate", "launch_date"),
    abcProducts: pickBrief(brief, flat, "abcProducts", "abc_products"),
    segment: pickBrief(brief, flat, "segment", "customer_segments"),
    subSegment: pickBrief(brief, flat, "subSegment", "sub_segments"),
    geography: pickBrief(brief, flat, "geography", "geographies"),
    operatorValue: pickBrief(brief, flat, "operatorValue", "operator_value"),
    memberValue: pickBrief(brief, flat, "memberValue", "member_value"),
    painPoints:
      pickBrief(brief, flat, "painPoints", "pain_points") ||
      painPointsFromJson(flat),
    qualifyingCriteria: pickBrief(
      brief,
      flat,
      "qualifyingCriteria",
      "qualifying_criteria",
    ),
    knockOuts: pickBrief(brief, flat, "knockOuts", "not_a_fit"),
    icpNotes: pickBrief(brief, flat, "icpNotes", "icp_notes", "ideal_customer_profile"),
    pricing: pickBrief(brief, flat, "pricing", "pricing_model"),
    discounts: pickBrief(brief, flat, "discounts", "abc_discounts"),
    commission: pickBrief(brief, flat, "commission", "commission_model"),
    integrationName:
      pickBrief(brief, flat, "integrationName", "integration_name") ||
      (asStr(flat.has_integration)
        ? `has_integration: ${asStr(flat.has_integration)}`
        : ""),
    goLiveDate:
      pickBrief(
        brief,
        flat,
        "goLiveDate",
        "target_go_live_date",
        "onboarding_timeline",
      ) || asStr(json?.targetDateHuman),
    setupModel: pickBrief(brief, flat, "setupModel", "setup_model"),
    customerFacingDescription: pickBrief(
      brief,
      flat,
      "customerFacingDescription",
      "customer_facing_workflow",
    ),
    prerequisites:
      pickBrief(brief, flat, "prerequisites") || prerequisitesFromJson(flat),
    dataAbcToPartner:
      pickBrief(brief, flat, "dataAbcToPartner", "data_abc_to_partner") ||
      dx.toPartner,
    dataPartnerToAbc:
      pickBrief(brief, flat, "dataPartnerToAbc", "data_partner_to_abc") ||
      dx.toAbc,
    limitations:
      pickBrief(brief, flat, "limitations") || limitationsFromJson(flat),
    errors: pickBrief(brief, flat, "errors") || errorsFromJson(flat),
    supportEmail: pickBrief(
      brief,
      flat,
      "supportEmail",
      "integration_support_contact",
    ),
    activationProcess: pickBrief(
      brief,
      flat,
      "activationProcess",
      "activation_process",
    ),
    activationOwnership:
      pickBrief(brief, flat, "activationOwnership", "activation_ownership") ||
      responsibilityMatrixFromJson(flat),
    postReferral: pickBrief(
      brief,
      flat,
      "postReferral",
      "post_referral_journey",
    ),
    supportTicket: pickBrief(
      brief,
      flat,
      "supportTicket",
      "support_ticket_process",
    ),
    primaryContact,
    escalationContact:
      pickBrief(brief, flat, "escalationContact", "escalation_contact") ||
      escalationFromContacts(flat),
    customerQuote: pickBrief(brief, flat, "customerQuote", "social_proof"),
    valueProp: pickResearch(
      research,
      flat,
      "valueProp",
      "partner_one_liner",
      "operator_value",
    ),
    idealCustomerProfile: pickResearch(
      research,
      flat,
      "idealCustomerProfile",
      "ideal_customer_profile",
    ),
    scope:
      pickResearch(research, flat, "scope", "sales_motion", "referral_process") ||
      [asStr(flat.upsell_cross_sell), asStr(flat.referral_process)]
        .filter(Boolean)
        .join("\n"),
    competitiveLandscape:
      pickResearch(
        research,
        flat,
        "competitiveLandscape",
        "not_a_fit",
        "upsell_cross_sell",
      ),
    contact: {
      name: asStr(json?.contact?.name) || asStr(json[`contacts__0__name`]),
      email: asStr(json?.contact?.email) || asStr(json[`contacts__0__email`]),
    },
    searchBlob: "",
  };

  partner.searchBlob = [
    partner.name,
    partner.website,
    partner.oneLiner,
    partner.archetype,
    partner.partnershipType,
    partner.abcProducts,
    partner.segment,
    partner.subSegment,
    partner.geography,
    partner.operatorValue,
    partner.memberValue,
    partner.painPoints,
    partner.qualifyingCriteria,
    partner.knockOuts,
    partner.icpNotes,
    partner.pricing,
    partner.discounts,
    partner.commission,
    partner.integrationName,
    partner.setupModel,
    partner.customerFacingDescription,
    partner.prerequisites,
    partner.dataAbcToPartner,
    partner.dataPartnerToAbc,
    partner.limitations,
    partner.errors,
    partner.activationProcess,
    partner.postReferral,
    partner.supportTicket,
    partner.primaryContact,
    partner.customerQuote,
    partner.valueProp,
    partner.idealCustomerProfile,
    partner.scope,
    partner.competitiveLandscape,
    contactsBlock,
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase();
  return partner;
}

export interface RankedPartner {
  partner: CatalogPartner;
  score: number;
  matches: string[];
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "for",
  "of",
  "to",
  "in",
  "on",
  "with",
  "is",
  "are",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "best",
  "good",
  "great",
  "please",
  "can",
  "could",
  "would",
  "should",
  "need",
  "want",
  "looking",
  "suggest",
  "recommend",
  "recommendation",
  "show",
  "find",
  "give",
  "tell",
  "any",
  "some",
  "one",
  "partner",
  "partners",
  "company",
  "service",
  "provider",
  "help",
  "do",
  "have",
  "be",
  "what",
  "which",
  "who",
  "how",
  "where",
  "from",
  "about",
  "into",
  "as",
  "or",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
]);

const SYNONYMS: Record<string, string[]> = {
  payment: ["payments", "billing", "checkout", "pos", "card", "processor"],
  processor: ["payment", "payments", "gateway"],
  website: ["site", "web", "landing", "page"],
  creator: ["builder", "designer", "developer"],
  trainer: ["training", "coach", "instructor", "fitness"],
  gym: ["fitness", "studio", "club", "workout"],
  access: ["entry", "nfc", "lock", "door"],
  identity: ["iam", "sso", "idp", "auth", "okta"],
  marketing: ["campaign", "email", "growth"],
  data: ["analytics", "warehouse", "snowflake"],
  crm: ["sales", "hubspot", "salesforce"],
  security: ["secops", "audit", "compliance"],
};

export function rankPartners(
  query: string,
  partners: CatalogPartner[],
): RankedPartner[] {
  const tokens = tokenize(query);
  if (tokens.length === 0 || partners.length === 0) {
    return partners.map((p) => ({ partner: p, score: 0, matches: [] }));
  }
  const expanded = expandTokens(tokens);
  const ranked: RankedPartner[] = partners.map((p) => {
    let score = 0;
    const matches = new Set<string>();
    for (const token of expanded) {
      const occurrences = countOccurrences(p.searchBlob, token);
      if (occurrences === 0) continue;
      let weight = 1;
      if (p.name.toLowerCase().includes(token)) weight += 5;
      if (p.oneLiner.toLowerCase().includes(token)) weight += 3;
      if (p.partnershipType.toLowerCase().includes(token)) weight += 2;
      if (p.valueProp.toLowerCase().includes(token)) weight += 2;
      score += occurrences * weight;
      matches.add(token);
    }
    return { partner: p, score, matches: Array.from(matches) };
  });
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

function tokenize(s: string): string[] {
  return Array.from(
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
    ),
  );
}

function expandTokens(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const t of tokens) {
    const syns = SYNONYMS[t];
    if (syns) syns.forEach((s) => out.add(s));
  }
  return Array.from(out);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count += 1;
    idx += needle.length;
  }
  return count;
}

export function summarizeForPrompt(partners: CatalogPartner[]): string {
  if (partners.length === 0) return "(no partners in catalog)";
  return partners
    .map((p, i) => {
      const fields: Array<[string, string, number]> = [
        ["website", p.website, 120],
        ["one_liner", p.oneLiner, 220],
        ["partnership_type", p.partnershipType, 80],
        ["archetype", p.archetype, 80],
        ["abc_products", p.abcProducts, 120],
        ["segment", p.segment, 80],
        ["sub_segment", p.subSegment, 80],
        ["geography", p.geography, 120],
        ["launch_date", p.launchDate, 80],
        ["go_live_date", p.goLiveDate, 80],
        ["value_prop", p.valueProp, 360],
        ["ideal_customer_profile", p.idealCustomerProfile, 360],
        ["operator_value", p.operatorValue, 320],
        ["member_value", p.memberValue, 240],
        ["pain_points_solved", p.painPoints, 280],
        ["qualifying_criteria", p.qualifyingCriteria, 220],
        ["knock_outs", p.knockOuts, 160],
        ["icp_notes", p.icpNotes, 200],
        ["competitive_landscape", p.competitiveLandscape, 240],
        ["scope", p.scope, 280],
        ["pricing", p.pricing, 200],
        ["discounts", p.discounts, 160],
        ["commission", p.commission, 160],
        ["integration_name", p.integrationName, 120],
        ["setup_model", p.setupModel, 80],
        ["customer_facing_description", p.customerFacingDescription, 320],
        ["prerequisites", p.prerequisites, 280],
        ["data_abc_to_partner", p.dataAbcToPartner, 280],
        ["data_partner_to_abc", p.dataPartnerToAbc, 280],
        ["limitations", p.limitations, 200],
        ["common_errors", p.errors, 240],
        ["activation_process", p.activationProcess, 280],
        ["activation_ownership", p.activationOwnership, 240],
        ["post_referral_process", p.postReferral, 240],
        ["support_ticket_routing", p.supportTicket, 240],
        ["support_email", p.supportEmail, 120],
        ["primary_contact", p.primaryContact, 200],
        ["escalation_contact", p.escalationContact, 200],
        ["customer_quote", p.customerQuote, 280],
      ];
      const lines = [`Partner ${i + 1}: ${p.name}`];
      for (const [key, value, max] of fields) {
        if (!value) continue;
        lines.push(`  ${key}: ${truncate(value, max)}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
