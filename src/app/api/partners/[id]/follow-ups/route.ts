import { NextResponse } from "next/server";
import { getPartner, updatePartner } from "@/lib/storage";
import { evaluateFollowUps } from "@/lib/followups";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: "ack" | "evaluate";
    level?: 10 | 20 | 30;
  };
  const partner = await getPartner(params.id);
  if (!partner)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.action === "ack" && body.level) {
    const updated = await updatePartner(partner.id, (p) => ({
      ...p,
      followUps: p.followUps.map((f) =>
        f.level === body.level ? { ...f, acknowledged: true } : f,
      ),
    }));
    return NextResponse.json({ partner: updated });
  }

  const updated = await updatePartner(partner.id, (p) => ({
    ...p,
    followUps: evaluateFollowUps(p),
  }));
  return NextResponse.json({ partner: updated });
}
