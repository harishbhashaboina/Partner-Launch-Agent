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

const DEFAULT_DIR = "Users/harishbhashaboina/Desktop/hackathon/Partner-Launch-Agent/generated";
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

function normalize(
  folderName: string,
  folderPath: string,
  json: any,
): CatalogPartner | null {
  const research = json?.research ?? {};
  const brief = json?.briefData ?? {};
  const name = String(json?.partnerName ?? folderName).trim();
  if (!name) return null;
  const str = (v: any): string => String(v ?? "").trim();
  const partner: CatalogPartner = {
    id: str(json?.partnerId) || folderName,
    folder: folderPath,
    name,
    website: str(json?.website),
    oneLiner: str(brief?.oneLiner),
    archetype: str(research?.archetype) || str(brief?.partnershipType),
    partnershipType: str(brief?.partnershipType),
    launchDate: str(brief?.launchDate),
    abcProducts: str(brief?.abcProducts),
    segment: str(brief?.segment),
    subSegment: str(brief?.subSegment),
    geography: str(brief?.geography),
    operatorValue: str(brief?.operatorValue),
    memberValue: str(brief?.memberValue),
    painPoints: str(brief?.painPoints),
    qualifyingCriteria: str(brief?.qualifyingCriteria),
    knockOuts: str(brief?.knockOuts),
    icpNotes: str(brief?.icpNotes),
    pricing: str(brief?.pricing),
    discounts: str(brief?.discounts),
    commission: str(brief?.commission),
    integrationName: str(brief?.integrationName),
    goLiveDate: str(brief?.goLiveDate) || str(json?.targetDateHuman),
    setupModel: str(brief?.setupModel),
    customerFacingDescription: str(brief?.customerFacingDescription),
    prerequisites: str(brief?.prerequisites),
    dataAbcToPartner: str(brief?.dataAbcToPartner),
    dataPartnerToAbc: str(brief?.dataPartnerToAbc),
    limitations: str(brief?.limitations),
    errors: str(brief?.errors),
    supportEmail: str(brief?.supportEmail),
    activationProcess: str(brief?.activationProcess),
    activationOwnership: str(brief?.activationOwnership),
    postReferral: str(brief?.postReferral),
    supportTicket: str(brief?.supportTicket),
    primaryContact: str(brief?.primaryContact),
    escalationContact: str(brief?.escalationContact),
    customerQuote: str(brief?.customerQuote),
    valueProp: str(research?.valueProp),
    idealCustomerProfile: str(research?.idealCustomerProfile),
    scope: str(research?.scope),
    competitiveLandscape: str(research?.competitiveLandscape),
    contact: {
      name: str(json?.contact?.name),
      email: str(json?.contact?.email),
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
    partner.icpNotes,
    partner.integrationName,
    partner.customerFacingDescription,
    partner.prerequisites,
    partner.valueProp,
    partner.idealCustomerProfile,
    partner.scope,
    partner.competitiveLandscape,
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
