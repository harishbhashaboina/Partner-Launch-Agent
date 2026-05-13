import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPartnerByChatToken, updatePartner } from "@/lib/storage";
import { generateLaunchTimeline, partnerChatPrompt } from "@/lib/agent";
import type { Partner } from "@/lib/types";

export async function POST(
  _req: Request,
  { params }: { params: { token: string } },
) {
  const partner = await getPartnerByChatToken(params.token);
  if (!partner || !partner.partnerChat)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = partner.research!;
  const s = partner.partnerChat.partnerInputs;
  const summary = {
    finalizedAt: new Date().toISOString(),
    valueProp: r.valueProp,
    idealCustomerProfile: r.idealCustomerProfile,
    scope: r.scope,
    integrationOverview: s.integrationDescription ?? "",
    targetDate: s.targetDate ?? "",
    partnerNotes: s.reviewNotes ?? "",
  };

  const closedMsg = await partnerChatPrompt({
    partner,
    step: "closed",
  });

  let updated = await updatePartner(partner.id, (p): Partner => {
    if (!p.partnerChat) return p;
    return {
      ...p,
      stage: "summarized",
      summary,
      partnerChat: {
        ...p.partnerChat,
        step: "closed",
        messages: [
          ...p.partnerChat.messages,
          {
            id: nanoid(8),
            role: "agent",
            ts: new Date().toISOString(),
            content: closedMsg,
            meta: { step: "closed" },
          },
        ],
      },
    };
  });

  const timeline = await generateLaunchTimeline(updated);
  updated = await updatePartner(updated.id, (p) => ({
    ...p,
    stage: "launching",
    timeline,
  }));

  return NextResponse.json({ partner: updated });
}
