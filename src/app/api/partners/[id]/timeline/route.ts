import { NextResponse } from "next/server";
import { getPartner, updatePartner } from "@/lib/storage";
import { generateLaunchTimeline } from "@/lib/agent";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const partner = await getPartner(params.id);
  if (!partner)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const timeline = await generateLaunchTimeline(partner);
    const updated = await updatePartner(partner.id, (p) => ({
      ...p,
      timeline,
      partnerChat: p.partnerChat && {
        ...p.partnerChat,
        partnerInputs: {
          ...(p.partnerChat.partnerInputs ?? {}),
          targetDate: timeline.targetDate,
        },
      },
      stage: p.stage === "summarized" ? "launching" : p.stage,
    }));
    return NextResponse.json({ partner: updated });
  } catch (err) {
    console.error("Timeline generation failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Timeline generation failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = (await req.json()) as {
    commId: "coming-soon" | "prepare-for-launch" | "new-partner-live";
    status?: "scheduled" | "drafted" | "sent";
    subject?: string;
    bodyMd?: string;
  };
  const updated = await updatePartner(params.id, (p) => {
    if (!p.timeline) return p;
    return {
      ...p,
      timeline: {
        ...p.timeline,
        communications: p.timeline.communications.map((c) =>
          c.id === body.commId
            ? {
                ...c,
                status: body.status ?? c.status,
                subject: body.subject ?? c.subject,
                body: body.bodyMd ?? c.body,
              }
            : c,
        ),
      },
      stage:
        body.status === "sent" && body.commId === "new-partner-live"
          ? "live"
          : p.stage,
    };
  });
  return NextResponse.json({ partner: updated });
}
