import { promises as fs } from "fs";
import path from "path";

export type IntakeQuestionType =
  | "text"
  | "textarea"
  | "date"
  | "email"
  | "url"
  | "single_select"
  | "multi_select"
  | "file_or_url";

export interface IntakeJsonQuestion {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  helper_text?: string;
  required_if?: { field: string; contains: string };
  min_items?: number;
  max_items?: number;
  fields?: IntakeJsonQuestion[];
}

export interface IntakeJsonSection {
  section: string;
  questions: IntakeJsonQuestion[];
}

export interface PartnerIntakeDefinition {
  partner_launch_intake: IntakeJsonSection[];
}

export interface FlatIntakeQuestion {
  id: string;
  section: string;
  label: string;
  type: IntakeQuestionType | "repeatable_group" | "group";
  options?: string[];
  helperText?: string;
  required: boolean;
  requiredIf?: { field: string; contains: string };
  /** When true, skip this question in chat if `has_integration` is **No**. */
  integrationOnly?: boolean;
}

const QUESTION_FILE_CANDIDATES = [
  path.join(process.cwd(), "questions json", "partner-launch-intake.json"),
  path.join(process.cwd(), "questions json", "questions.json"),
];

let cached: FlatIntakeQuestion[] | null = null;
let cachedFromPath: string | null = null;

function normalizeType(t: string): FlatIntakeQuestion["type"] {
  if (
    t === "text" ||
    t === "textarea" ||
    t === "date" ||
    t === "email" ||
    t === "url" ||
    t === "single_select" ||
    t === "multi_select" ||
    t === "file_or_url" ||
    t === "repeatable_group" ||
    t === "group"
  ) {
    return t;
  }
  return "text";
}

function expandGroup(
  section: string,
  parentId: string,
  fields: IntakeJsonQuestion[],
  parentRequired: boolean,
  integrationOnly: boolean,
): FlatIntakeQuestion[] {
  const out: FlatIntakeQuestion[] = [];
  for (const f of fields) {
    out.push({
      id: `${parentId}.${f.id}`,
      section,
      label: f.label,
      type: normalizeType(f.type),
      options: f.options,
      helperText: f.helper_text,
      required: parentRequired ? Boolean(f.required) : Boolean(f.required),
      integrationOnly,
    });
  }
  return out;
}

function expandRepeatable(
  section: string,
  q: IntakeJsonQuestion,
  integrationOnly: boolean,
): FlatIntakeQuestion[] {
  const fields = q.fields ?? [];
  const min = q.min_items ?? 0;
  const max = q.max_items ?? Math.max(min, 1);

  if (min === 0) {
    return [
      {
        id: q.id,
        section,
        label: `${q.label} (reply **None** if not applicable, otherwise use a short bullet list — one item per line)`,
        type: "textarea",
        required: Boolean(q.required),
        integrationOnly,
      },
    ];
  }

  const count = Math.max(min, max || min);
  if (fields.length === 1 && min > 0) {
    const f = fields[0];
    return [
      {
        id: q.id,
        section,
        label: `${q.label} (enter **${min} to ${max}** entries, **one per line** — ${f.label}).`,
        type: "textarea",
        options: f.options,
        helperText:
          q.helper_text ??
          `Use a separate line for each item (${min} minimum). Bullets optional.`,
        required: Boolean(q.required),
        integrationOnly,
      },
    ];
  }
  const out: FlatIntakeQuestion[] = [];
  for (let i = 0; i < count; i++) {
    for (const f of fields) {
      const rowRequired =
        i < min ? Boolean(f.required) : Boolean(f.required) && Boolean(q.required);
      out.push({
        id: `${q.id}__${i}__${f.id}`,
        section,
        label: `${q.label} (${i + 1} of ${count}) — ${f.label}`,
        type: normalizeType(f.type),
        options: f.options,
        helperText: f.helper_text,
        required: rowRequired,
        integrationOnly,
      });
    }
  }
  return out;
}

function sectionIsIntegrationTechnical(sectionTitle: string): boolean {
  return sectionTitle.toLowerCase().includes("integration & technical");
}

function flattenSection(section: IntakeJsonSection): FlatIntakeQuestion[] {
  const integrationOnly = sectionIsIntegrationTechnical(section.section);
  const out: FlatIntakeQuestion[] = [];
  for (const q of section.questions) {
    if (q.type === "group" && q.fields?.length) {
      out.push(
        ...expandGroup(
          section.section,
          q.id,
          q.fields,
          Boolean(q.required),
          integrationOnly,
        ),
      );
      continue;
    }
    if (q.type === "repeatable_group" && q.fields?.length) {
      out.push(...expandRepeatable(section.section, q, integrationOnly));
      continue;
    }
    out.push({
      id: q.id,
      section: section.section,
      label: q.label,
      type: normalizeType(q.type),
      options: q.options,
      helperText: q.helper_text,
      required: Boolean(q.required),
      requiredIf: q.required_if,
      integrationOnly,
    });
  }
  return out;
}

async function resolveQuestionsPath(): Promise<string> {
  for (const candidate of QUESTION_FILE_CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }
  throw new Error(
    `No intake questions file found. Tried: ${QUESTION_FILE_CANDIDATES.join(", ")}`,
  );
}

export async function loadFlatIntakeQuestions(): Promise<FlatIntakeQuestion[]> {
  const resolved = await resolveQuestionsPath();
  if (cached && cachedFromPath === resolved) return cached;
  const raw = await fs.readFile(resolved, "utf8");
  const parsed = JSON.parse(raw) as PartnerIntakeDefinition;
  const flat: FlatIntakeQuestion[] = [];
  for (const sec of parsed.partner_launch_intake) {
    flat.push(...flattenSection(sec));
  }
  cached = flat;
  cachedFromPath = resolved;
  return flat;
}

/** True when partner should see integration technical intake and receive an Integration Guide. */
export function intakeIncludesIntegration(
  intakeAnswers: Record<string, unknown>,
): boolean {
  const raw = intakeAnswers.has_integration;
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === "no" || s === "false" || s === "n") return false;
  return true;
}

export function shouldOmitIntakeQuestion(
  q: FlatIntakeQuestion,
  intakeAnswers: Record<string, unknown>,
): boolean {
  return Boolean(q.integrationOnly) && !intakeIncludesIntegration(intakeAnswers);
}

export function getIntakeQuestionCount(
  flat: FlatIntakeQuestion[],
  intakeAnswers: Record<string, unknown>,
): number {
  return flat.filter((q) => !shouldOmitIntakeQuestion(q, intakeAnswers)).length;
}

export function getCurrentIntakeQuestion(
  flat: FlatIntakeQuestion[],
  intakeAnswers: Record<string, unknown>,
  intakeIndex: number,
): FlatIntakeQuestion | null {
  let n = 0;
  for (const q of flat) {
    if (shouldOmitIntakeQuestion(q, intakeAnswers)) continue;
    if (n === intakeIndex) return q;
    n++;
  }
  return null;
}

export function formatIntakeQuestionMessage(
  q: FlatIntakeQuestion,
  index: number,
  total: number,
): string {
  const bits = [
    `**${q.section}** · Question ${index + 1} of ${total}`,
    "",
    q.label,
  ];
  if (q.helperText) {
    bits.push("", `_${q.helperText}_`);
  }
  if (q.options?.length) {
    bits.push(
      "",
      q.type === "multi_select"
        ? `Options (reply with one line, comma-separated): ${q.options.join(", ")}`
        : `Options: ${q.options.join(" · ")}`,
    );
  }
  if (q.type === "date") {
    bits.push("", "_Use an ISO date (2026-06-01) or a phrase like “early June”._");
  }
  if (q.type === "file_or_url") {
    bits.push("", "_Paste a URL, describe the file, or use the paperclip to attach._");
  }
  return bits.join("\n");
}
