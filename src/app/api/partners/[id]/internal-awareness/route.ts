import { NextResponse } from "next/server";
import { getPartner, updatePartner } from "@/lib/storage";
import { generateInternalAwareness } from "@/lib/agent";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: "approve" | "regenerate" | "edit";
    subject?: string;
    body?: string;
  };
  const partner = await getPartner(params.id);
  if (!partner)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.action === "regenerate") {
    const updated = await updatePartner(partner.id, async (p) => ({
      ...p,
      internalAwareness: await generateInternalAwareness(p),
    }));
    return NextResponse.json({ partner: updated });
  }

  if (body.action === "edit") {
    const updated = await updatePartner(partner.id, (p) => ({
      ...p,
      internalAwareness: {
        subject: body.subject ?? p.internalAwareness?.subject ?? "",
        body: body.body ?? p.internalAwareness?.body ?? "",
        approvedAt: p.internalAwareness?.approvedAt,
      },
    }));
    return NextResponse.json({ partner: updated });
  }

  // approve
  const updated = await updatePartner(partner.id, (p) => ({
    ...p,
    internalAwareness: p.internalAwareness && {
      ...p.internalAwareness,
      approvedAt: new Date().toISOString(),
    },
  }));
  return NextResponse.json({ partner: updated });
}
