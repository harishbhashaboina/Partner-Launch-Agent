import { NextResponse } from "next/server";
import { deletePartner, getPartner, updatePartner } from "@/lib/storage";
import { evaluateFollowUps } from "@/lib/followups";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const partner = await getPartner(params.id);
  if (!partner)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const followUps = evaluateFollowUps(partner);
  if (followUps.length !== partner.followUps.length) {
    const updated = await updatePartner(partner.id, (p) => ({
      ...p,
      followUps,
    }));
    return NextResponse.json({ partner: updated });
  }
  return NextResponse.json({ partner });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  await deletePartner(params.id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const patch = await req.json();
  const updated = await updatePartner(params.id, (p) => ({ ...p, ...patch }));
  return NextResponse.json({ partner: updated });
}
