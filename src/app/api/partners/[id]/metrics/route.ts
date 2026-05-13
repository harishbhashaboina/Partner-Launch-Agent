import { NextResponse } from "next/server";
import { getPartner, updatePartner } from "@/lib/storage";
import { generateMetricsNarrative } from "@/lib/agent";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = (await req.json()) as {
    kpis?: Record<string, string>;
    successStories?: string;
  };
  const partner = await getPartner(params.id);
  if (!partner)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const metrics = await generateMetricsNarrative({
    partner,
    kpis: body.kpis ?? {},
    successStories: body.successStories ?? "",
  });

  const updated = await updatePartner(partner.id, (p) => ({
    ...p,
    metrics,
    stage: "retro",
  }));
  return NextResponse.json({ partner: updated });
}
