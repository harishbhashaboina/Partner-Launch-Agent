import { NextResponse } from "next/server";
import { getPartnerByChatToken } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } },
) {
  const partner = await getPartnerByChatToken(params.token);
  if (!partner)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    partner: {
      id: partner.id,
      name: partner.name,
      website: partner.website,
      contact: partner.contact,
      research: partner.research,
    },
    chat: partner.partnerChat,
  });
}
