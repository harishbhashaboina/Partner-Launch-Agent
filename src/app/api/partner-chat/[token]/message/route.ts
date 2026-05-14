import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  getPartnerByChatToken,
  updatePartner,
} from "@/lib/storage";
import { partnerChatPrompt } from "@/lib/agent";
import {
  formatIntakeQuestionMessage,
  getCurrentIntakeQuestion,
  getIntakeQuestionCount,
  loadFlatIntakeQuestions,
} from "@/lib/partner-intake-questions";
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

function migrateLegacyStep(step: PartnerChatStep): PartnerChatStep {
  if (
    step === "review-details" ||
    step === "integration-details" ||
    step === "target-date"
  ) {
    return "intake";
  }
  return step;
}

export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  const body = (await req.json()) as IncomingMessage;
  const partner = await getPartnerByChatToken(params.token);
  if (!partner || !partner.partnerChat)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const flat = await loadFlatIntakeQuestions();
  let step = migrateLegacyStep(partner.partnerChat.step);
  let intakeIndex = partner.partnerChat.intakeIndex ?? 0;
  const intakeAnswers: Record<string, unknown> = {
    ...(partner.partnerChat.intakeAnswers ?? {}),
  };
  const intakeTotal = () => getIntakeQuestionCount(flat, intakeAnswers);
  const partnerInputs = { ...(partner.partnerChat.partnerInputs ?? {}) };

  const now = new Date().toISOString();
  const partnerMsg: ChatMessage = {
    id: nanoid(8),
    role: "partner",
    ts: now,
    content: body.content,
    attachments: body.attachments ?? [],
    meta: { step },
  };

  const messages: ChatMessage[] = [
    ...partner.partnerChat.messages,
    partnerMsg,
  ];

  let nextStep = step;
  const agentMessages: ChatMessage[] = [];

  if (step === "intake") {
    const totalBefore = intakeTotal();
    if (intakeIndex < totalBefore) {
      const q = getCurrentIntakeQuestion(flat, intakeAnswers, intakeIndex);
      if (q) intakeAnswers[q.id] = body.content;
      intakeIndex += 1;
    }

    const totalAfter = intakeTotal();
    if (intakeIndex < totalAfter) {
      const nq = getCurrentIntakeQuestion(flat, intakeAnswers, intakeIndex);
      if (nq) {
        agentMessages.push({
          id: nanoid(8),
          role: "agent",
          ts: new Date(Date.now() + 80).toISOString(),
          content: formatIntakeQuestionMessage(nq, intakeIndex, totalAfter),
          meta: { step: "intake" },
        });
      } else {
        nextStep = "summary";
        agentMessages.push({
          id: nanoid(8),
          role: "agent",
          ts: new Date(Date.now() + 80).toISOString(),
          content: await partnerChatPrompt({
            partner: {
              ...partner,
              partnerChat: {
                ...partner.partnerChat,
                intakeAnswers,
                intakeIndex,
                partnerInputs,
              },
            },
            step: "summary",
          }),
          meta: { step: "summary" },
        });
      }
    } else if (intakeIndex >= totalAfter && totalAfter > 0) {
      nextStep = "summary";
      agentMessages.push({
        id: nanoid(8),
        role: "agent",
        ts: new Date(Date.now() + 80).toISOString(),
        content: await partnerChatPrompt({
          partner: {
            ...partner,
            partnerChat: {
              ...partner.partnerChat,
              intakeAnswers,
              intakeIndex,
              partnerInputs,
            },
          },
          step: "summary",
        }),
        meta: { step: "summary" },
      });
    }
  } else if (step === "summary") {
    partnerInputs.reviewNotes = body.content;
    agentMessages.push({
      id: nanoid(8),
      role: "agent",
      ts: new Date(Date.now() + 80).toISOString(),
      content:
        "Thanks — noted. When you are ready, use **Confirm & Close** to finalize and generate your launch pack.",
      meta: { step: "summary" },
    });
  }

  const updated = await updatePartner(partner.id, (p): Partner => {
    if (!p.partnerChat) return p;
    return {
      ...p,
      partnerChat: {
        ...p.partnerChat,
        step: nextStep,
        intakeIndex,
        intakeAnswers,
        partnerInputs,
        attachments: [
          ...p.partnerChat.attachments,
          ...(body.attachments ?? []),
        ],
        messages: [...messages, ...agentMessages],
        lastPartnerResponseAt: now,
      },
    };
  });
  return NextResponse.json({ chat: updated.partnerChat });
}
