import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPartner, updatePartner } from "@/lib/storage";
import { partnerChatPrompt } from "@/lib/agent";
import {
  formatIntakeQuestionMessage,
  getCurrentIntakeQuestion,
  getIntakeQuestionCount,
  loadFlatIntakeQuestions,
} from "@/lib/partner-intake-questions";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const partner = await getPartner(params.id);
  if (!partner)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!partner.research)
    return NextResponse.json(
      { error: "Partner research not ready" },
      { status: 400 },
    );

  const token = partner.partnerChat?.token ?? nanoid(14);
  const flat = await loadFlatIntakeQuestions();
  const welcome = await partnerChatPrompt({
    partner,
    step: "welcome",
  });
  const intakeAnswers: Record<string, unknown> = {};
  const total = getIntakeQuestionCount(flat, intakeAnswers);
  const firstQ = getCurrentIntakeQuestion(flat, intakeAnswers, 0);
  const first = firstQ
    ? `${welcome}\n\n${formatIntakeQuestionMessage(firstQ, 0, total)}`
    : `${welcome}\n\n_(No intake questions configured.)_`;
  const now = new Date().toISOString();

  const updated = await updatePartner(partner.id, (p) => ({
    ...p,
    stage: "partner-chat",
    partnerChat: {
      token,
      step: "intake",
      intakeIndex: 0,
      intakeAnswers: {},
      partnerInputs: p.partnerChat?.partnerInputs ?? {},
      messages: [
        {
          id: nanoid(8),
          role: "agent",
          ts: now,
          content: first,
          meta: { step: "intake" },
        },
      ],
      attachments: p.partnerChat?.attachments ?? [],
    },
  }));
  return NextResponse.json({ partner: updated, token });
}
