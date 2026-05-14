import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";
import type { Partner } from "./types";
import { intakeIncludesIntegration } from "./partner-intake-questions";

const TEMPLATES_DIR = path.join(process.cwd(), "templates");
const GENERATED_ROOT = path.join(process.cwd(), "generated");

export function sanitizePartnerFolderName(name: string): string {
  const s = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return s || "partner";
}

function escapeXmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function str(
  answers: Record<string, unknown>,
  key: string,
  fallback = "—",
): string {
  const v = answers[key];
  if (v === undefined || v === null) return fallback;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return fallback;
    if (
      t.length < 600 &&
      t.startsWith("[") &&
      t.endsWith("]") &&
      /^\[[\s\S]*\]$/.test(t)
    ) {
      try {
        const parsed = JSON.parse(t) as unknown;
        if (Array.isArray(parsed)) {
          const joined = parsed
            .map(String)
            .map((s) => s.trim())
            .filter(Boolean)
            .join(", ");
          if (joined) return joined;
        }
      } catch {
        /* keep as plain string */
      }
    }
    return t;
  }
  if (Array.isArray(v)) {
    const joined = v
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
    return joined || fallback;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

/** Comma-separated answer for multi-select style fields (tries aliases). */
function strList(
  answers: Record<string, unknown>,
  keys: string[],
  fallback = "—",
): string {
  for (const key of keys) {
    const s = str(answers, key, "");
    if (s && s !== "—") return s;
  }
  return fallback;
}

function splitBulletLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .filter((l) => !/^none$/i.test(l));
}

function hasKeyPrefix(answers: Record<string, unknown>, prefix: string): boolean {
  return Object.keys(answers).some((k) => k.startsWith(prefix));
}

/**
 * Expands one-line / blob answers (from textarea intakes) into the
 * `id__row__field` keys expected by Partner Data Brief & Integration Guide.
 */
export function expandIntakeForTemplates(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const answers: Record<string, unknown> = { ...raw };

  if (typeof answers.pain_points === "string" && !hasKeyPrefix(answers, "pain_points__")) {
    splitBulletLines(answers.pain_points as string)
      .slice(0, 6)
      .forEach((line, i) => {
        answers[`pain_points__${i}__pain_point`] = line;
      });
  }

  if (typeof answers.contacts === "string" && !hasKeyPrefix(answers, "contacts__")) {
    const fields = [
      "contact_type",
      "name",
      "title",
      "email",
      "phone_or_slack",
    ] as const;
    splitBulletLines(answers.contacts as string).forEach((line, i) => {
      if (!line.includes("|")) {
        answers[`contacts__${i}__name`] = line;
        return;
      }
      const parts = line.split("|").map((x) => x.trim());
      fields.forEach((f, j) => {
        if (parts[j]) answers[`contacts__${i}__${f}`] = parts[j];
      });
    });
  }

  function expandBlobTable(
    id: string,
    firstField: string,
    maxRows: number,
  ): void {
    const v = answers[id];
    if (typeof v !== "string" || hasKeyPrefix(answers, `${id}__`)) return;
    const lines = splitBulletLines(v);
    lines.slice(0, maxRows).forEach((line, i) => {
      answers[`${id}__${i}__${firstField}`] = line;
    });
  }

  expandBlobTable("prerequisites", "requirement", 4);
  expandBlobTable("known_limitations", "limitation", 3);

  if (typeof answers.common_errors === "string" && !hasKeyPrefix(answers, "common_errors__")) {
    const t = (answers.common_errors as string).trim();
    if (t && !/^none$/i.test(t)) {
      answers["common_errors__0__error_symptom"] = t.slice(0, 400);
    }
  }

  if (typeof answers.sales_materials === "string" && !hasKeyPrefix(answers, "sales_materials__")) {
    const t = (answers.sales_materials as string).trim();
    if (t && !/^none$/i.test(t)) {
      answers["sales_materials__0__material_name"] = t.slice(0, 400);
      answers["sales_materials__0__material_type"] = "Other";
    }
  }

  if (typeof answers.data_exchange === "string" && !hasKeyPrefix(answers, "data_exchange__")) {
    const t = (answers.data_exchange as string).trim();
    if (t && !/^none$/i.test(t)) {
      answers["data_exchange__0__direction"] = "ABC → Partner";
      answers["data_exchange__0__field_name"] = t.slice(0, 800);
      answers["data_exchange__0__data_type"] = "Summary";
      answers["data_exchange__0__trigger_frequency"] = "—";
      answers["data_exchange__0__notes_conditions"] = "—";
    }
  }

  if (str(answers, "data_exchange__0__field_name") === "—") {
    const w = str(answers, "customer_facing_workflow");
    if (w !== "—") {
      answers["data_exchange__0__direction"] = "ABC → Partner";
      answers["data_exchange__0__field_name"] = w.slice(0, 1200);
      answers["data_exchange__0__data_type"] = "Customer workflow (intake)";
      answers["data_exchange__0__trigger_frequency"] = "—";
      answers["data_exchange__0__notes_conditions"] = "—";
    }
  }

  if (str(answers, "prerequisites__0__requirement") === "—") {
    const w = str(answers, "setup_model");
    if (w !== "—") {
      answers["prerequisites__0__requirement"] = `Setup model: ${w}`;
      answers["prerequisites__0__details"] = str(answers, "customer_facing_workflow").slice(0, 400);
      answers["prerequisites__0__owner"] = "Partner";
    }
  }

  const nar0 = str(answers, "data_exchange__0__field_name");
  if (
    nar0 !== "—" &&
    str(answers, "data_exchange__1__direction") === "—"
  ) {
    answers["data_exchange__1__direction"] = "Partner → ABC";
    answers["data_exchange__1__field_name"] = nar0.slice(0, 800);
    answers["data_exchange__1__data_type"] = str(answers, "data_exchange__0__data_type");
    answers["data_exchange__1__trigger_frequency"] = "—";
    answers["data_exchange__1__notes_conditions"] =
      "Auto-filled from intake narrative when no separate Partner→ABC rows were provided.";
  }

  return answers;
}

function splitWorkflow(text: string): [string, string, string] {
  const t = text.trim();
  if (!t) return ["—", "—", "—"];
  const parts = t
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) return [parts[0], parts[1], parts[2]];
  if (parts.length === 2) return [parts[0], parts[1], "—"];
  const sentences = t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length >= 3)
    return [sentences[0], sentences[1], sentences.slice(2).join(" ")];
  if (sentences.length === 2) return [sentences[0], sentences[1], "—"];
  return [t, "—", "—"];
}

function rowValues(
  answers: Record<string, unknown>,
  prefix: string,
  fields: string[],
  rows: number,
): string[] {
  const out: string[] = [];
  for (let i = 0; i < rows; i++) {
    for (const f of fields) {
      out.push(str(answers, `${prefix}__${i}__${f}`));
    }
  }
  return out;
}

function deBlock(
  answers: Record<string, unknown>,
  dirNeedle: string,
): string[] {
  const fields = [
    "field_name",
    "data_type",
    "trigger_frequency",
    "notes_conditions",
  ];
  const out: string[] = [];
  for (let i = 0; i < 4; i++) {
    const d = str(answers, `data_exchange__${i}__direction`);
    if (!d.includes(dirNeedle)) {
      out.push("—", "—", "—", "—");
      continue;
    }
    for (const f of fields) {
      out.push(str(answers, `data_exchange__${i}__${f}`));
    }
  }
  return out;
}

function buildPartnerDataBriefQueue(
  answers: Record<string, unknown>,
): string[] {
  const [w1, w2, w3] = splitWorkflow(
    str(answers, "customer_facing_workflow", ""),
  );

  const pains = [
    str(answers, "pain_points__0__pain_point"),
    str(answers, "pain_points__1__pain_point"),
    str(answers, "pain_points__2__pain_point"),
    str(answers, "pain_points__3__pain_point"),
  ];

  const icp = str(answers, "ideal_customer_profile");
  const qualifying = icp.length > 500 ? `${icp.slice(0, 497)}…` : icp;

  const prereq = rowValues(
    answers,
    "prerequisites",
    ["requirement", "details", "owner"],
    4,
  );

  const abcToPartner = deBlock(answers, "ABC → Partner");
  const partnerToAbc = deBlock(answers, "Partner → ABC");

  const lim = rowValues(
    answers,
    "known_limitations",
    ["limitation", "impact", "workaround"],
    3,
  );

  const err = rowValues(
    answers,
    "common_errors",
    [
      "error_symptom",
      "likely_cause",
      "first_responder",
      "resolution_steps",
    ],
    4,
  );

  const contactFlat: string[] = [];
  for (let i = 0; i < 3; i++) {
    contactFlat.push(
      str(answers, `contacts__${i}__contact_type`),
      str(answers, `contacts__${i}__name`),
      str(answers, `contacts__${i}__title`),
      str(answers, `contacts__${i}__email`),
    );
  }

  const comm = [str(answers, "commission_model"), str(answers, "upsell_cross_sell")]
    .filter((x) => x && x !== "—")
    .join(" · ");

  return [
    str(answers, "partner_name"),
    str(answers, "partner_one_liner"),
    str(answers, "launch_date"),
    str(answers, "partner_logo"),
    str(answers, "operator_value"),
    str(answers, "member_value"),
    ...pains,
    qualifying || "—",
    str(answers, "not_a_fit"),
    icp || "—",
    str(answers, "pricing_model"),
    str(answers, "abc_discounts"),
    comm || "—",
    str(answers, "integration_name"),
    str(answers, "target_go_live_date"),
    w1,
    w2,
    w3,
    ...prereq,
    ...abcToPartner,
    ...partnerToAbc,
    ...lim,
    ...err,
    str(answers, "integration_support_contact"),
    str(answers, "activation_process"),
    str(answers, "responsibility_matrix.abc_owns"),
    str(answers, "responsibility_matrix.partner_owns"),
    str(answers, "responsibility_matrix.customer_owns"),
    str(answers, "post_referral_journey"),
    str(answers, "support_ticket_process"),
    ...contactFlat,
    str(answers, "social_proof"),
  ];
}

function buildIntegrationGuideQueue(
  answers: Record<string, unknown>,
): string[] {
  const prereq = rowValues(
    answers,
    "prerequisites",
    ["requirement", "details", "owner"],
    3,
  );
  return [
    ...prereq,
    ...deBlock(answers, "ABC → Partner"),
    ...deBlock(answers, "Partner → ABC"),
    ...rowValues(
      answers,
      "known_limitations",
      ["limitation", "impact", "workaround"],
      3,
    ),
    ...rowValues(
      answers,
      "common_errors",
      [
        "error_symptom",
        "likely_cause",
        "first_responder",
        "resolution_steps",
      ],
      4,
    ),
  ];
}

function applyEnterReplacements(xml: string, values: string[]): string {
  let i = 0;
  return xml.replace(
    /<w:t([^>]*)>([^<]*)\[Enter\]([^<]*)<\/w:t>/g,
    (_full, attrs: string, pre: string, post: string) => {
      const raw = values[i++] ?? "—";
      const inner = escapeXmlText(raw);
      return `<w:t${attrs}>${pre}${inner}${post}</w:t>`;
    },
  );
}

function regexEscapeInner(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace first w:t whose inner text exactly matches `inner` (after XML entity decode). */
function replaceFirstWtExactInner(
  xml: string,
  inner: string,
  value: string,
): string {
  return xml.replace(
    new RegExp(`<w:t([^>]*)>${regexEscapeInner(inner)}<\\/w:t>`),
    (_m, attrs: string) => `<w:t${attrs}>${escapeXmlText(value)}</w:t>`,
  );
}

/** Replace from opening `<w:r` of the run that contains `startWt` through end of run that contains `endWt`. */
/** Start of a real `<w:r …>` run; avoids `<w:rPr`, `<w:rFonts`, etc. */
function lastRealRunOpenBefore(xml: string, beforeIndex: number): number {
  let pos = beforeIndex;
  while (pos > 0) {
    const i = xml.lastIndexOf("<w:r", pos - 1);
    if (i === -1) return -1;
    const next = xml.charAt(i + 4);
    if (
      next === " " ||
      next === ">" ||
      next === "\t" ||
      next === "\n" ||
      next === "\r"
    ) {
      return i;
    }
    pos = i;
  }
  return -1;
}

function replaceRunRangeBetweenWtTags(
  xml: string,
  startWtTag: string,
  endWtTag: string,
  replacementRunsXml: string,
): string {
  const iStart = xml.indexOf(startWtTag);
  if (iStart === -1) return xml;
  const iRunOpen = lastRealRunOpenBefore(xml, iStart);
  const iEnd = xml.indexOf(endWtTag, iStart);
  if (iEnd === -1 || iRunOpen === -1) return xml;
  const iRunClose = xml.indexOf("</w:r>", iEnd);
  if (iRunClose === -1) return xml;
  return (
    xml.slice(0, iRunOpen) +
    replacementRunsXml +
    xml.slice(iRunClose + "</w:r>".length)
  );
}

function replaceEveryRunRangeBetweenWtTags(
  xml: string,
  startWtTag: string,
  endWtTag: string,
  replacementRunsXml: string,
): string {
  let out = xml;
  while (out.includes(startWtTag) && out.includes(endWtTag)) {
    const before = out;
    out = replaceRunRangeBetweenWtTags(out, startWtTag, endWtTag, replacementRunsXml);
    if (out === before) break;
  }
  return out;
}

const IG_PLACEHOLDER_VALUE_CUSTOMER =
  "[What does this integration allow the gym owner or operator to do that they could not do before? Focus on operational or business outcomes \u2014 e.g., reduced manual work, new revenue, improved retention.]";

const IG_PLACEHOLDER_VALUE_MEMBER =
  "[What does this integration improve or unlock for the end member? Focus on their experience \u2014 e.g., seamless access, connected app experience, personalized services.]";

function igBoldRun(text: string): string {
  return `<w:r><w:rPr><w:b/><w:bCs/><w:color w:val="29A9E1"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXmlText(text)}</w:t></w:r>`;
}

/**
 * Fills Integration Guide cover page: title row, integration name / date, value fields,
 * and replaces product/setup option picklists with the intake answers.
 * Must run before {@link applyEnterReplacements} so `[Enter]` slots stay aligned.
 */
function applyIntegrationGuideCoverFills(
  xml: string,
  answers: Record<string, unknown>,
): string {
  let out = xml;

  const partner = str(answers, "partner_name");
  const integ = str(answers, "integration_name");
  const goLive =
    str(answers, "target_go_live_date") !== "—"
      ? str(answers, "target_go_live_date")
      : str(answers, "launch_date");
  const products = strList(answers, ["abc_products", "integrated_products"]);
  const setup = str(answers, "setup_model");
  const opVal = str(answers, "operator_value");
  const memVal = str(answers, "member_value");

  out = replaceFirstWtExactInner(out, "Partner Name", partner);
  out = replaceFirstWtExactInner(out, "[Enter integration name]", integ);
  out = replaceFirstWtExactInner(out, "[Date]", goLive);
  out = replaceFirstWtExactInner(out, IG_PLACEHOLDER_VALUE_CUSTOMER, opVal);
  out = replaceFirstWtExactInner(out, IG_PLACEHOLDER_VALUE_MEMBER, memVal);

  out = replaceRunRangeBetweenWtTags(
    out,
    "<w:t>Ignite</w:t>",
    "<w:t>GymSales</w:t>",
    igBoldRun(products),
  );
  out = replaceRunRangeBetweenWtTags(
    out,
    "<w:t>Self-Serve</w:t>",
    "<w:t>ABC-Assisted</w:t>",
    igBoldRun(setup),
  );

  out = out.replace(
    /<w:t xml:space="preserve"> \(choose applicable\)<\/w:t>/g,
    `<w:t xml:space="preserve"> </w:t>`,
  );
  out = out.replace(
    /<w:t>choose<\/w:t>/,
    `<w:t></w:t>`,
  );
  out = out.replace(
    /<w:t xml:space="preserve"> applicable\)<\/w:t>/,
    `<w:t xml:space="preserve"> </w:t>`,
  );

  return out;
}

/** w:t cells whose visible text is a single bracketed placeholder (Word instructions). */
function extractBracketPlaceholderInners(xml: string): string[] {
  const out: string[] = [];
  const re = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const inner = m[2];
    const t = inner.trim();
    if (t.startsWith("[") && t.endsWith("]") && t.length >= 8) {
      out.push(inner);
    }
  }
  return out;
}

function replaceWtExactNth(
  xml: string,
  innerLiteral: string,
  value: string,
  zeroBasedIndex: number,
): string {
  const re = new RegExp(
    `<w:t([^>]*)>${regexEscapeInner(innerLiteral)}<\\/w:t>`,
    "g",
  );
  let n = 0;
  return xml.replace(re, (full, attrs: string) => {
    if (n++ !== zeroBasedIndex) return full;
    return `<w:t${attrs}>${escapeXmlText(value)}</w:t>`;
  });
}

function formatPainList(answers: Record<string, unknown>): string {
  const lines: string[] = [];
  for (let i = 0; i < 6; i++) {
    const line = str(answers, `pain_points__${i}__pain_point`);
    if (line !== "—") lines.push(`• ${line}`);
  }
  return lines.join("\n") || "—";
}

function formatSalesMaterials(answers: Record<string, unknown>): string {
  const lines: string[] = [];
  for (let i = 0; i < 10; i++) {
    const name = str(answers, `sales_materials__${i}__material_name`);
    if (name === "—") break;
    const typ = str(answers, `sales_materials__${i}__material_type`);
    const link = str(answers, `sales_materials__${i}__material_link`);
    const bit = link !== "—" ? `${name} (${typ}) — ${link}` : `${name} (${typ})`;
    lines.push(`• ${bit}`);
  }
  return lines.join("\n") || str(answers, "social_proof");
}

function formatContactsFaq(answers: Record<string, unknown>): string {
  const lines: string[] = [];
  for (let i = 0; i < 3; i++) {
    const bits = [
      str(answers, `contacts__${i}__contact_type`),
      str(answers, `contacts__${i}__name`),
      str(answers, `contacts__${i}__title`),
      str(answers, `contacts__${i}__email`),
      str(answers, `contacts__${i}__phone_or_slack`),
    ].filter((x) => x !== "—");
    if (bits.length) lines.push(bits.join(" · "));
  }
  return lines.join("\n") || "—";
}

function formatGeo(answers: Record<string, unknown>): string {
  const g = str(answers, "geographies");
  const o = str(answers, "other_geography");
  if (o !== "—" && g.includes("Other")) return `${g}. Other: ${o}`;
  return g;
}

/** One run for Partner Data Brief SCOPE picklists (matches body text size/color, bold). */
function pdbScopeAnswerRun(text: string): string {
  return `<w:r><w:rPr><w:b/><w:bCs/><w:color w:val="555555"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXmlText(text)}</w:t></w:r>`;
}

/**
 * Replaces printed option lists in the SCOPE table with the intake answers
 * (Partner Data Brief template ships Ignite | GloFox | … style rows).
 */
function applyPartnerDataBriefScopePicklists(
  xml: string,
  answers: Record<string, unknown>,
): string {
  const products = strList(answers, ["abc_products", "integrated_products"]);
  const segments = str(answers, "customer_segments");
  const subSeg = str(answers, "sub_segments");
  const geo = formatGeo(answers);

  let out = xml;
  out = replaceEveryRunRangeBetweenWtTags(
    out,
    `<w:t xml:space="preserve">  Ignite  </w:t>`,
    `<w:t xml:space="preserve">  GymSales  </w:t>`,
    pdbScopeAnswerRun(products),
  );
  out = replaceEveryRunRangeBetweenWtTags(
    out,
    `<w:t xml:space="preserve">  Gym  </w:t>`,
    `<w:t xml:space="preserve">  Coach  </w:t>`,
    pdbScopeAnswerRun(segments),
  );
  out = replaceEveryRunRangeBetweenWtTags(
    out,
    `<w:t xml:space="preserve">  SMB (1 loc.)  </w:t>`,
    `<w:t xml:space="preserve">  GES (40+ locs.)  </w:t>`,
    pdbScopeAnswerRun(subSeg),
  );
  out = replaceEveryRunRangeBetweenWtTags(
    out,
    `<w:t xml:space="preserve">  US  </w:t>`,
    `<w:t xml:space="preserve">  Other  </w:t>`,
    pdbScopeAnswerRun(geo),
  );
  return out;
}

function formatPricingBlock(answers: Record<string, unknown>): string {
  return [
    str(answers, "pricing_model"),
    str(answers, "abc_discounts"),
    str(answers, "commission_model"),
  ]
    .filter((x) => x !== "—")
    .join("\n\n") || "—";
}

function formatRaciBlock(answers: Record<string, unknown>): string {
  return [
    `ABC: ${str(answers, "responsibility_matrix.abc_owns")}`,
    `Partner: ${str(answers, "responsibility_matrix.partner_owns")}`,
    `Customer: ${str(answers, "responsibility_matrix.customer_owns")}`,
  ].join("\n");
}

function buildFaqFillValues(
  answers: Record<string, unknown>,
  placeholders: string[],
): string[] {
  const products = strList(answers, ["abc_products", "integrated_products"]);
  const valueCombo = [
    str(answers, "partner_one_liner"),
    str(answers, "operator_value"),
    str(answers, "member_value"),
  ]
    .filter((x) => x !== "—")
    .join("\n\n") || "—";
  const timelineBits = [
    str(answers, "onboarding_timeline"),
    str(answers, "referral_process"),
  ]
    .filter((x) => x !== "—")
    .join("\n") || "—";

  const byTrim = new Map<string, string>();
  for (const ph of placeholders) {
    byTrim.set(ph.trim(), "—");
  }

  for (const ph of placeholders) {
    const t = ph.trim();
    if (t === "[Enter product]") byTrim.set(t, products);
    else if (t === "[Enter segment]") byTrim.set(t, str(answers, "customer_segments"));
    else if (t === "[Enter sub-segment]") byTrim.set(t, str(answers, "sub_segments"));
    else if (t === "[Enter geography]") byTrim.set(t, formatGeo(answers));
    else if (t.startsWith("[Describe the partner's core value prop")) {
      byTrim.set(t, valueCombo);
    } else if (t.startsWith("[List specific phrases")) {
      byTrim.set(t, formatPainList(answers));
    } else if (t.startsWith("[Step-by-step:")) {
      byTrim.set(t, str(answers, "support_ticket_process"));
    } else if (t.startsWith("[Describe the full journey:")) {
      byTrim.set(t, str(answers, "post_referral_journey"));
    } else if (t.startsWith("[e.g., minimum locations")) {
      byTrim.set(t, str(answers, "not_a_fit"));
    } else if (t.startsWith("[What does the partner own")) {
      byTrim.set(t, formatRaciBlock(answers));
    } else if (t.startsWith("[Typical timeline from referral")) {
      byTrim.set(t, timelineBits);
    } else if (t.startsWith("[List available assets:")) {
      byTrim.set(t, formatSalesMaterials(answers));
    } else if (t.startsWith("[Include the correct product category")) {
      byTrim.set(t, str(answers, "support_ticket_process"));
    } else if (t.startsWith("[Where in Salesforce")) {
      byTrim.set(t, str(answers, "referral_tracking"));
    } else if (t.startsWith("[Internal: Name / Slack")) {
      byTrim.set(t, formatContactsFaq(answers));
    } else if (t.startsWith("[Include customer-facing pricing")) {
      byTrim.set(t, formatPricingBlock(answers));
    }
  }

  return placeholders.map((ph) => byTrim.get(ph.trim()) ?? "—");
}

function buildProcessGuideFillValues(
  answers: Record<string, unknown>,
  placeholders: string[],
): string[] {
  const products = strList(answers, ["abc_products", "integrated_products"]);

  return placeholders.map((ph, i) => {
    const t = ph.trim();
    if (t === "[Enter product]") return products;
    if (t === "[Enter segment]") return str(answers, "customer_segments");
    if (t === "[Enter sub-segment]") return str(answers, "sub_segments");
    if (t === "[Enter geography]") return formatGeo(answers);
    if (t.startsWith("[If applicable")) return str(answers, "pricing_model");
    if (t.startsWith("[What does the rep/ABC earn")) {
      return str(answers, "commission_model");
    }
    if (t.startsWith("[Describe scenarios where this partner")) {
      return str(answers, "upsell_cross_sell");
    }
    if (t === "[Enter responsibilities]") {
      const occ = placeholders
        .slice(0, i)
        .filter((p) => p.trim() === "[Enter responsibilities]").length;
      if (occ === 0) return str(answers, "responsibility_matrix.abc_owns");
      if (occ === 1) return str(answers, "responsibility_matrix.partner_owns");
      return str(answers, "responsibility_matrix.customer_owns");
    }
    if (t.startsWith("[Describe the full activation")) {
      const occ = placeholders
        .slice(0, i)
        .filter((p) =>
          p.trim().startsWith("[Describe the full activation"),
        ).length;
      return occ === 1
        ? str(answers, "activation_process")
        : str(answers, "support_ticket_process");
    }
    if (t.trimStart() === "[Enter name]") {
      return str(answers, "contacts__0__name");
    }
    return "—";
  });
}

function applyBracketSequentialFills(
  xml: string,
  placeholders: string[],
  values: string[],
): string {
  let out = xml;
  for (let i = 0; i < placeholders.length; i++) {
    const inner = placeholders[i];
    const val = values[i] ?? "—";
    const occ = placeholders.slice(0, i).filter((p) => p === inner).length;
    out = replaceWtExactNth(out, inner, val, occ);
  }
  return out;
}

function applyProcessGuideSplitPlaceholders(
  xml: string,
  answers: Record<string, unknown>,
): string {
  const email = str(answers, "contacts__0__email");
  const phone = str(answers, "contacts__0__phone_or_slack");
  const emailBlock =
    /<w:t xml:space="preserve">\s*\[\s*<\/w:t><\/w:r><w:proofErr w:type="gramEnd"\s*\/>[\s\S]{0,800}?<w:t>Enter email]<\/w:t>/;
  const phoneBlock =
    /<w:t xml:space="preserve">\s*\[\s*<\/w:t><\/w:r><w:proofErr w:type="gramEnd"\s*\/>[\s\S]{0,800}?<w:t>Enter]<\/w:t>/;
  return xml
    .replace(
      emailBlock,
      `<w:t xml:space="preserve">${escapeXmlText(email)}</w:t>`,
    )
    .replace(
      phoneBlock,
      `<w:t xml:space="preserve">${escapeXmlText(phone)}</w:t>`,
    );
}

function applyFaqLastUpdatedDate(xml: string): string {
  const d = new Date();
  const stamp = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
  return xml.replace(/5\/7\/26/g, stamp);
}

async function fillDocxBracketTemplate(
  templateName: "Partner Launch FAQ.docx" | "Process Guide.docx",
  answers: Record<string, unknown>,
  outPath: string,
): Promise<void> {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  const buf = await fs.readFile(templatePath);
  const zip = await JSZip.loadAsync(buf);
  const entry = zip.file("word/document.xml");
  if (!entry) throw new Error("word/document.xml missing");
  let xml = await entry.async("string");
  if (
    templateName === "Partner Launch FAQ.docx" ||
    templateName === "Process Guide.docx"
  ) {
    xml = replaceFirstWtExactInner(
      xml,
      "Partner Name",
      str(answers, "partner_name"),
    );
  }
  const placeholders = extractBracketPlaceholderInners(xml);
  const values =
    templateName === "Partner Launch FAQ.docx"
      ? buildFaqFillValues(answers, placeholders)
      : buildProcessGuideFillValues(answers, placeholders);
  xml = applyBracketSequentialFills(xml, placeholders, values);
  if (templateName === "Process Guide.docx") {
    xml = applyProcessGuideSplitPlaceholders(xml, answers);
  } else {
    xml = applyFaqLastUpdatedDate(xml);
  }
  zip.file("word/document.xml", xml);
  const out = await zip.generateAsync({ type: "nodebuffer" });
  await fs.writeFile(outPath, out);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPdfSummaryHtml(args: {
  title: string;
  partnerName: string;
  answers: Record<string, unknown>;
  /** When true, omit companion-PDF wording (PDF not copied into the pack). */
  summaryOnly?: boolean;
}): string {
  const a = args.answers;
  const rows: [string, string][] = [
    ["Partner", str(a, "partner_name")],
    ["One-liner", str(a, "partner_one_liner")],
    ["Partnership type", str(a, "partnership_type")],
    ["Value to operator", str(a, "operator_value")],
    ["Value to member", str(a, "member_value")],
    ["ICP", str(a, "ideal_customer_profile")],
    ["Integration", str(a, "integration_name")],
    ["Go-live", str(a, "target_go_live_date")],
    ["Customer workflow", str(a, "customer_facing_workflow")],
    ["Pricing", str(a, "pricing_model")],
    ["Social proof", str(a, "social_proof")],
  ];
  const body = rows
    .map(
      ([k, v]) =>
        `<tr><th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(k)}</th><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(v)}</td></tr>`,
    )
    .join("\n");
  const lead = args.summaryOnly
    ? `Intake summary for <strong>${escapeHtml(args.partnerName)}</strong> (HTML only for this deck — no PDF was added to the pack).`
    : `HTML summary generated from partner launch intake for <strong>${escapeHtml(args.partnerName)}</strong>. Use the companion PDF in this folder for the designed deck.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(args.title)}</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:32px;}
main{max-width:880px;margin:0 auto;background:#1e293b;border-radius:12px;padding:28px 32px;box-shadow:0 12px 40px rgba(0,0,0,.35);}
h1{font-size:1.35rem;margin:0 0 8px;}
p.lead{color:#94a3b8;margin:0 0 24px;font-size:0.95rem;}
table{width:100%;border-collapse:collapse;font-size:0.9rem;}
th{width:200px;color:#94a3b8;font-weight:600;}
td{color:#f1f5f9;}
footer{margin-top:28px;font-size:0.75rem;color:#64748b;}
</style>
</head>
<body>
<main>
<h1>${escapeHtml(args.title)}</h1>
<p class="lead">${lead}</p>
<table>
<tbody>
${body}
</tbody>
</table>
<footer>Partner Launch Agent · ${escapeHtml(new Date().toISOString().slice(0, 10))}</footer>
</main>
</body>
</html>`;
}

async function fillDocxFromTemplate(
  templateName: string,
  values: string[],
  outPath: string,
  mergedIntake?: Record<string, unknown>,
): Promise<void> {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  const buf = await fs.readFile(templatePath);
  const zip = await JSZip.loadAsync(buf);
  const entry = zip.file("word/document.xml");
  if (!entry) throw new Error("word/document.xml missing");
  let xml = await entry.async("string");
  if (templateName === "Partner Data Brief.docx" && mergedIntake) {
    xml = applyPartnerDataBriefScopePicklists(xml, mergedIntake);
  }
  if (templateName === "Integration Guide.docx" && mergedIntake) {
    xml = applyIntegrationGuideCoverFills(xml, mergedIntake);
  }
  xml = applyEnterReplacements(xml, values);
  zip.file("word/document.xml", xml);
  const out = await zip.generateAsync({ type: "nodebuffer" });
  await fs.writeFile(outPath, out);
}

export async function writePartnerGeneratedPack(args: {
  partner: Partner;
  intakeAnswers: Record<string, unknown>;
}): Promise<{ folder: string; files: string[] }> {
  const merged = expandIntakeForTemplates(args.intakeAnswers);
  const nameKey = str(merged, "partner_name", "") || args.partner.name;
  const folderName = sanitizePartnerFolderName(nameKey);
  const dir = path.join(GENERATED_ROOT, folderName);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(
    path.join(dir, "intake-answers.json"),
    JSON.stringify(args.intakeAnswers, null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.join(dir, "intake-expanded.json"),
    JSON.stringify(merged, null, 2),
    "utf8",
  );

  const files: string[] = ["intake-answers.json", "intake-expanded.json"];

  const briefValues = buildPartnerDataBriefQueue(merged);
  if (briefValues.length !== 110) {
    console.warn(
      `Partner Data Brief fill queue length ${briefValues.length}, expected 110`,
    );
  }
  const briefOut = path.join(dir, "Partner Data Brief.docx");
  await fillDocxFromTemplate("Partner Data Brief.docx", briefValues, briefOut, merged);
  files.push("Partner Data Brief.docx");

  if (intakeIncludesIntegration(args.intakeAnswers)) {
    const igValues = buildIntegrationGuideQueue(merged);
    if (igValues.length !== 66) {
      console.warn(
        `Integration Guide fill queue length ${igValues.length}, expected 66`,
      );
    }
    const igOut = path.join(dir, "Integration Guide.docx");
    await fillDocxFromTemplate("Integration Guide.docx", igValues, igOut, merged);
    files.push("Integration Guide.docx");
  }

  const faqOut = path.join(dir, "Partner Launch FAQ.docx");
  await fillDocxBracketTemplate("Partner Launch FAQ.docx", merged, faqOut);
  files.push("Partner Launch FAQ.docx");

  const pgOut = path.join(dir, "Process Guide.docx");
  await fillDocxBracketTemplate("Process Guide.docx", merged, pgOut);
  files.push("Process Guide.docx");

  for (const name of await fs.readdir(TEMPLATES_DIR)) {
    if (
      name === "Partner Data Brief.docx" ||
      name === "Integration Guide.docx" ||
      name === "Partner Launch FAQ.docx" ||
      name === "Process Guide.docx"
    )
      continue;
    if (name.startsWith(".")) continue;
    const src = path.join(TEMPLATES_DIR, name);
    const st = await fs.stat(src);
    if (!st.isFile()) continue;

    const lower = name.toLowerCase();
    const pdfHtmlOnly =
      lower === "ideal customer profile.pdf" ||
      lower === "customer facing ppt.pdf";

    if (pdfHtmlOnly) {
      const base = name.replace(/\.pdf$/i, "");
      const html = buildPdfSummaryHtml({
        title: `${base} — intake summary`,
        partnerName: nameKey,
        answers: merged,
        summaryOnly: true,
      });
      const htmlName = `${base}-summary.html`;
      await fs.writeFile(path.join(dir, htmlName), html, "utf8");
      files.push(htmlName);
      continue;
    }

    const dest = path.join(dir, name);
    await fs.copyFile(src, dest);
    files.push(name);
    if (name.toLowerCase().endsWith(".pdf")) {
      const base = name.replace(/\.pdf$/i, "");
      const title = `${base} — intake summary`;
      const html = buildPdfSummaryHtml({
        title,
        partnerName: nameKey,
        answers: merged,
      });
      const htmlName = `${base}-summary.html`;
      await fs.writeFile(path.join(dir, htmlName), html, "utf8");
      files.push(htmlName);
    }
  }

  return { folder: dir, files };
}
