import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  getPartnerByChatToken,
  updatePartner,
} from "@/lib/storage";
import { partnerChatPrompt } from "@/lib/agent";
import type {
  Attachment,
  ChatMessage,
  Partner,
  PartnerChatStep,
} from "@/lib/types";

interface IncomingMessage {
  content: string;
  attachments?: Attachment[];
}

const NEXT_STEP: Record<PartnerChatStep, PartnerChatStep> = {
  welcome: "review-details",
  "review-details": "integration-details",
  "integration-details": "target-date",
  "target-date": "summary",
  summary: "closed",
  closed: "closed",
};

function parseDate(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();

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
  const lower = trimmed.toLowerCase();

  const monthWord = `(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)`;
  const cleaned = lower.replace(/(\d+)(st|nd|rd|th)\b/g, "$1");

  const monthFirst = cleaned.match(
    new RegExp(`\\b${monthWord}\\b[\\s.,]*?(\\d{1,2})?(?:[\\s.,]*(\\d{4}))?`),
  );
  const dayFirst = cleaned.match(
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
    const part = cleaned.match(/\b(early|mid|late|end of|beginning of)\b/);
    let day = dayHint ?? 15;
    if (!dayHint && part) {
      const kw = part[1];
      if (kw === "early" || kw === "beginning of") day = 5;
      else if (kw === "mid") day = 15;
      else day = 25;
    }
    const candidate = new Date(year, m, day);
    if (candidate.getTime() < Date.now()) candidate.setFullYear(year + 1);
    if (!Number.isNaN(candidate.getTime())) return candidate.toISOString();
  }

  const qtr = lower.match(/\bq([1-4])\s*(\d{4})?/);
  if (qtr) {
    const q = Number(qtr[1]);
    const year = qtr[2] ? Number(qtr[2]) : new Date().getFullYear();
    return new Date(year, (q - 1) * 3 + 1, 15).toISOString();
  }

  return undefined;
}

export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  const body = (await req.json()) as IncomingMessage;
  const partner = await getPartnerByChatToken(params.token);
  if (!partner || !partner.partnerChat)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentStep = partner.partnerChat.step;
  const partnerInputs = { ...partner.partnerChat.partnerInputs };

  if (currentStep === "review-details") {
    partnerInputs.reviewNotes = body.content;
  } else if (currentStep === "integration-details") {
    partnerInputs.integrationDescription = body.content;
  } else if (currentStep === "target-date") {
    partnerInputs.targetDate = parseDate(body.content) ?? partnerInputs.targetDate;
  }

  const now = new Date().toISOString();
  const partnerMsg: ChatMessage = {
    id: nanoid(8),
    role: "partner",
    ts: now,
    content: body.content,
    attachments: body.attachments ?? [],
    meta: { step: currentStep },
  };

  const nextStep = NEXT_STEP[currentStep];

  let agentMsg: ChatMessage | undefined;
  let secondAgentMsg: ChatMessage | undefined;
  if (nextStep !== "closed") {
    agentMsg = {
      id: nanoid(8),
      role: "agent",
      ts: new Date(Date.now() + 100).toISOString(),
      content: await partnerChatPrompt({
        partner: { ...partner, partnerChat: { ...partner.partnerChat, partnerInputs } },
        step: nextStep,
      }),
      meta: { step: nextStep },
    };
  }
  if (nextStep === "summary") {
    secondAgentMsg = {
      id: nanoid(8),
      role: "agent",
      ts: new Date(Date.now() + 200).toISOString(),
      content: await partnerChatPrompt({
        partner: { ...partner, partnerChat: { ...partner.partnerChat, partnerInputs } },
        step: "summary",
      }),
      meta: { step: "summary" },
    };
  }

  const updated = await updatePartner(partner.id, (p): Partner => {
    if (!p.partnerChat) return p;
    return {
      ...p,
      partnerChat: {
        ...p.partnerChat,
        step: nextStep,
        partnerInputs,
        attachments: [
          ...p.partnerChat.attachments,
          ...(body.attachments ?? []),
        ],
        messages: [
          ...p.partnerChat.messages,
          partnerMsg,
          ...(agentMsg ? [agentMsg] : []),
          ...(secondAgentMsg ? [secondAgentMsg] : []),
        ],
        lastPartnerResponseAt: now,
      },
    };
  });
  return NextResponse.json({ chat: updated.partnerChat });
}
