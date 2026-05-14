import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPartnerByChatToken, updatePartner } from "@/lib/storage";
import { generateLaunchTimeline, partnerChatPrompt } from "@/lib/agent";
import { writePartnerGeneratedPack } from "@/lib/partner-output";
import type { Partner } from "@/lib/types";

function str(a: Record<string, unknown> | undefined, k: string): string {
  if (!a) return "";
  const v = a[k];
  return typeof v === "string" ? v.trim() : "";
}

function parseDateLoose(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();
  return undefined;
}

export async function POST(
  _req: Request,
  { params }: { params: { token: string } },
) {
  const partner = await getPartnerByChatToken(params.token);
  if (!partner || !partner.partnerChat)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = partner.research!;
  const intake = partner.partnerChat.intakeAnswers ?? {};
  const notes = partner.partnerChat.partnerInputs?.reviewNotes ?? "";

  const integrationOverview =
    str(intake as Record<string, unknown>, "customer_facing_workflow") ||
    partner.partnerChat.partnerInputs?.integrationDescription ||
    "";

  const targetRaw =
    str(intake as Record<string, unknown>, "target_go_live_date") ||
    str(intake as Record<string, unknown>, "launch_date") ||
    partner.partnerChat.partnerInputs?.targetDate ||
    "";

  const summary = {
    finalizedAt: new Date().toISOString(),
    valueProp: r.valueProp,
    idealCustomerProfile: r.idealCustomerProfile,
    scope: r.scope,
    integrationOverview,
    targetDate: parseDateLoose(targetRaw) ?? targetRaw,
    partnerNotes: notes,
  };

  let generated: { folder: string; files: string[] } | undefined;
  try {
    generated = await writePartnerGeneratedPack({
      partner,
      intakeAnswers: intake as Record<string, unknown>,
    });
  } catch (err) {
    console.error("Partner pack generation failed", err);
  }

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
            content: generated
              ? `${closedMsg}\n\nGenerated files under \`${generated.folder}\` (${generated.files.length} items).`
              : closedMsg,
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
    partnerChat: p.partnerChat && {
      ...p.partnerChat,
      partnerInputs: {
        ...(p.partnerChat.partnerInputs ?? {}),
        targetDate: timeline.targetDate,
        integrationDescription: integrationOverview,
        reviewNotes: notes,
      },
    },
  }));

  return NextResponse.json({ partner: updated, generated });
}
