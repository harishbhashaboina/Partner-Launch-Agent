import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { listPartners, upsertPartner } from "@/lib/storage";
import { generateInternalAwareness, generateResearchBrief } from "@/lib/agent";
import type { Partner } from "@/lib/types";

export async function GET() {
  const partners = await listPartners();
  return NextResponse.json({ partners });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    website?: string;
    contactName?: string;
    contactEmail?: string;
  };
  if (!body.name || !body.website || !body.contactName || !body.contactEmail) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const id = nanoid(10);
  const now = new Date().toISOString();
  const skeleton: Partner = {
    id,
    name: body.name.trim(),
    website: body.website.trim(),
    contact: {
      name: body.contactName.trim(),
      email: body.contactEmail.trim(),
    },
    createdAt: now,
    updatedAt: now,
    stage: "research",
    followUps: [],
  };
  await upsertPartner(skeleton);

  const research = await generateResearchBrief({
    name: skeleton.name,
    website: skeleton.website,
    contact: skeleton.contact,
  });
  const withResearch: Partner = {
    ...skeleton,
    research,
    stage: "internal-review",
  };
  const internalAwareness = await generateInternalAwareness(withResearch);

  const finalPartner: Partner = {
    ...withResearch,
    internalAwareness,
  };
  await upsertPartner(finalPartner);

  return NextResponse.json({ partner: finalPartner });
}
