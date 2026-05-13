import Link from "next/link";
import { notFound } from "next/navigation";
import { getPartner, updatePartner } from "@/lib/storage";
import { evaluateFollowUps } from "@/lib/followups";
import { StageRail } from "@/components/StageRail";
import { PartnerDetailClient } from "./PartnerDetailClient";

export const dynamic = "force-dynamic";

export default async function PartnerPage({
  params,
}: {
  params: { id: string };
}) {
  let partner = await getPartner(params.id);
  if (!partner) notFound();
  const followUps = evaluateFollowUps(partner);
  if (followUps.length !== partner.followUps.length) {
    partner = await updatePartner(partner.id, (p) => ({ ...p, followUps }));
  }
  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-block text-xs text-white/50 hover:text-white/80"
      >
        ← Back to dashboard
      </Link>
      <PartnerDetailClient initialPartner={partner} />
      <StageRail stage={partner.stage} />
    </div>
  );
}
