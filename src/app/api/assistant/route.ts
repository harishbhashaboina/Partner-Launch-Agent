import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  loadPartnerCatalog,
  rankPartners,
  summarizeForPrompt,
  type CatalogPartner,
} from "@/lib/partner-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || undefined;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const client = apiKey ? new OpenAI({ apiKey, baseURL }) : null;

const BASE_SYSTEM = `You are "AI BOT", ABC Fitness's partner assistant for customers and operators.

You can do any of the following, depending on what the user asks:
1. Recommend the best partner for a stated need (e.g. "suggest a payment processor", "we need access control").
2. Answer specific questions about a named partner (pricing, integration, setup model, prerequisites, contacts, support, what data flows, common errors, activation steps, customer quote, etc.).
3. Compare two or more partners on dimensions the user cares about.
4. Explain partner-archetype concepts (Data Affiliate / Go-To-Market / Platform / Channel) at a high level.
5. Handle small talk briefly, then steer back to what you can help with.

Strict rules:
- The "Partner catalog" block below is your ONLY source of truth about specific partners. Never invent partners, prices, websites, contacts, integration mechanics, or numbers that are not in the catalog.
- If the user asks about a partner that is not in the catalog, say so plainly and list the partners that are available.
- If the answer truly isn't in the catalog, say "I don't have that in the partner catalog" and (a) suggest who to contact (use primary_contact / escalation_contact / support_email from the catalog if available) or (b) ask one clarifying question.
- Keep answers concise. Default to 2–6 short sentences. Use bullet lists when listing 3+ items. Use a small markdown table for side-by-side comparisons.
- Always bold partner names with **markdown**.
- Use plain markdown only. No HTML. No emojis other than at most one in greetings.
- If recommending: lead with the recommended partner in bold, give 1–3 sentences of why (tying to the user's need with operator_value / pain_points_solved / segment / partnership_type), then optionally a one-line runner-up. End with a short, helpful next-step prompt like "Want the partner brief or an intro?".
- If the user asks something obviously not about ABC partners (e.g. "what's the weather?"), politely redirect: you're here to help with ABC Fitness partner questions.`;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  let body: { messages?: IncomingMessage[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const cleaned = messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
    .slice(-12);

  if (cleaned.length === 0) {
    return NextResponse.json(
      { error: "messages[] is required" },
      { status: 400 },
    );
  }

  const lastUser = [...cleaned].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return NextResponse.json(
      { error: "no user message found" },
      { status: 400 },
    );
  }

  const catalog = await loadPartnerCatalog();

  if (catalog.length === 0) {
    return NextResponse.json({
      reply:
        "I couldn't load the partner catalog right now. Make sure partner briefs exist in the configured templates folder and try again.",
      mode: client ? "openai" : "mock",
    });
  }

  if (client) {
    try {
      const catalogBlock = summarizeForPrompt(catalog);
      const system = `${BASE_SYSTEM}\n\nPartner catalog (the ONLY partners you may reference):\n\n${catalogBlock}`;
      const res = await client.chat.completions.create({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          ...cleaned.map((m) => ({ role: m.role, content: m.content })),
        ],
      });
      const reply =
        res.choices[0]?.message?.content?.trim() ||
        "Sorry — I didn't catch that. Could you rephrase?";
      return NextResponse.json({ reply, mode: "openai" });
    } catch (err: any) {
      console.error("Assistant LLM call failed, falling back", err);
      const banner = openAiErrorBanner(err);
      const mock = mockReply(lastUser.content, catalog, { offlineNote: false });
      return NextResponse.json({
        reply: `${banner}\n\n${mock}`,
        mode: "openai-error",
        error: err?.message ?? String(err),
      });
    }
  }

  return NextResponse.json({
    reply: mockReply(lastUser.content, catalog, { offlineNote: true }),
    mode: "mock",
  });
}

function openAiErrorBanner(err: any): string {
  const status = err?.status ?? err?.response?.status;
  const code = err?.code ?? err?.error?.code ?? err?.response?.data?.error?.code;
  const type = err?.type ?? err?.error?.type ?? err?.response?.data?.error?.type;
  if (code === "insufficient_quota" || type === "insufficient_quota") {
    return "_(OpenAI quota is exhausted on this key — add billing at https://platform.openai.com/account/billing. Falling back to catalog-only answers below.)_";
  }
  if (status === 401 || code === "invalid_api_key") {
    return "_(OpenAI rejected the API key (401). Update `OPENAI_API_KEY` in `.env.local` and restart `npm run dev`. Falling back below.)_";
  }
  if (status === 429) {
    return "_(OpenAI is rate-limiting this key (429). Falling back to catalog-only answers below.)_";
  }
  return "_(Couldn't reach the AI service right now — falling back to catalog-only answers below.)_";
}

const OFFLINE_NOTE =
  "_(offline mode — set `OPENAI_API_KEY` in `.env.local` and restart `npm run dev` for full AI Q&A.)_";

interface MockOpts {
  offlineNote: boolean;
}

function mockReply(
  input: string,
  catalog: CatalogPartner[],
  opts: MockOpts = { offlineNote: true },
): string {
  const text = input.trim();
  if (!text) return "What kind of partner are you looking for?";

  const lower = text.toLowerCase();
  const tail = opts.offlineNote ? `\n\n${OFFLINE_NOTE}` : "";

  if (/^(hi|hey|hello|yo|hola|sup)\b/.test(lower)) {
    const names = catalog.map((p) => p.name).join(", ");
    return `Hi! I can help you find the right partner. Current catalog: ${names}.\n\nWhat are you looking for — e.g. payment processor, access control, identity? Or ask me about a specific partner.${tail}`;
  }
  if (/\b(list|all|catalog|partners)\b/.test(lower) && lower.length < 60) {
    return (
      "Here's the partner catalog:\n\n" +
      catalog
        .map(
          (p) =>
            `- **${p.name}** — ${
              p.oneLiner || p.partnershipType || p.archetype || "partner"
            }`,
        )
        .join("\n") +
      `\n\nAsk me about one of them or tell me what you need.${tail}`
    );
  }

  const directHit = findPartnerByName(text, catalog);
  if (directHit) {
    return partnerBriefAnswer(directHit) + tail;
  }

  const ranked = rankPartners(text, catalog).filter((r) => r.score > 0);
  const topScore = ranked[0]?.score ?? 0;
  const runnerScore = ranked[1]?.score ?? 0;
  const confident =
    topScore >= 8 && (topScore >= 20 || topScore >= runnerScore * 1.2);
  if (ranked.length === 0 || !confident) {
    const names = catalog.map((p) => p.name).join(", ");
    return `I don't see a partner in our catalog that clearly fits "${text}". Our current partners are: ${names}. Could you share a bit more about the problem you're trying to solve, or which ABC product (Ignite, GloFox, etc.) you're using?${tail}`;
  }

  const top = ranked[0].partner;
  const runnerUp =
    ranked[1]?.score && ranked[1].score >= topScore * 0.5
      ? ranked[1].partner
      : null;

  const why = top.operatorValue || top.valueProp || top.oneLiner;
  const lines: string[] = [];
  lines.push(`Based on what you described, I'd recommend **${top.name}**.`);
  if (top.oneLiner) lines.push(top.oneLiner);
  if (why && why !== top.oneLiner) {
    lines.push(`Why it fits: ${trimSentence(why, 220)}`);
  }
  if (runnerUp) {
    lines.push(
      `Also consider: ${runnerUp.name}${
        runnerUp.oneLiner ? ` — ${trimSentence(runnerUp.oneLiner, 120)}` : ""
      }.`,
    );
  }
  lines.push("Want me to share the partner brief or intro you?");
  return lines.join("\n\n") + tail;
}

function findPartnerByName(
  text: string,
  catalog: CatalogPartner[],
): CatalogPartner | null {
  const lower = text.toLowerCase();
  let best: { partner: CatalogPartner; len: number } | null = null;
  for (const p of catalog) {
    const name = p.name.toLowerCase();
    if (!name) continue;
    if (lower.includes(name) && (!best || name.length > best.len)) {
      best = { partner: p, len: name.length };
    }
  }
  return best?.partner ?? null;
}

function partnerBriefAnswer(p: CatalogPartner): string {
  const parts: string[] = [`**${p.name}**${p.oneLiner ? ` — ${p.oneLiner}` : ""}`];
  const facts: Array<[string, string]> = [
    ["Partnership type", p.partnershipType || p.archetype],
    ["ABC products", p.abcProducts],
    ["Segment", [p.segment, p.subSegment].filter(Boolean).join(" · ")],
    ["Geography", p.geography],
    ["Pricing", p.pricing],
    ["Setup model", p.setupModel],
    ["Integration", p.integrationName],
    ["Support", p.supportEmail],
    ["Primary contact", p.primaryContact],
  ];
  const visible = facts.filter(([, v]) => v);
  if (visible.length > 0) {
    parts.push(visible.map(([k, v]) => `- **${k}:** ${v}`).join("\n"));
  }
  if (p.operatorValue) {
    parts.push(`**Operator value:** ${trimSentence(p.operatorValue, 240)}`);
  }
  if (p.painPoints) {
    parts.push(`**Pain points solved:** ${trimSentence(p.painPoints, 240)}`);
  }
  return parts.join("\n\n");
}

function trimSentence(s: string, n: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= n) return clean;
  return clean.slice(0, n - 1).trimEnd() + "…";
}
