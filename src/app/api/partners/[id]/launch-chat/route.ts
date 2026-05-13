import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPartner, updatePartner } from "@/lib/storage";
import { partnerChatPrompt } from "@/lib/agent";

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
  const welcome = await partnerChatPrompt({
    partner,
    step: "welcome",
  });
  const now = new Date().toISOString();

  const updated = await updatePartner(partner.id, (p) => ({
    ...p,
    stage: "partner-chat",
    partnerChat: p.partnerChat ?? {
      token,
      step: "review-details",
      messages: [
        {
          id: nanoid(8),
          role: "agent",
          ts: now,
          content: welcome,
          meta: { step: "welcome" },
        },
      ],
      attachments: [],
      partnerInputs: {},
    },
  }));
  return NextResponse.json({ partner: updated, token });
}
