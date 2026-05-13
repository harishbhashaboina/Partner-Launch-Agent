import { notFound } from "next/navigation";
import { getPartnerByChatToken } from "@/lib/storage";
import { PartnerChatClient } from "./PartnerChatClient";

export const dynamic = "force-dynamic";

export default async function PartnerChatPage({
  params,
}: {
  params: { token: string };
}) {
  const partner = await getPartnerByChatToken(params.token);
  if (!partner || !partner.partnerChat) notFound();
  return (
    <PartnerChatClient
      token={params.token}
      partnerName={partner.name}
      contactName={partner.contact.name}
      initialChat={partner.partnerChat}
    />
  );
}
