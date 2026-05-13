import type { FollowUpAlert, Partner } from "./types";
import { daysBetween, now } from "./time";

export function evaluateFollowUps(p: Partner): FollowUpAlert[] {
  if (!p.partnerChat) return p.followUps ?? [];
  if (p.stage === "summarized" || p.stage === "launching" || p.stage === "live" || p.stage === "retro") {
    return p.followUps ?? [];
  }
  const last = p.partnerChat.lastPartnerResponseAt;
  const launchedAt =
    p.partnerChat.messages.find((m) => m.role === "agent")?.ts ?? p.createdAt;
  const reference = last ?? launchedAt;
  const days = daysBetween(new Date(reference), now());
  const existing = new Map(p.followUps.map((f) => [f.level, f]));

  const result: FollowUpAlert[] = [...p.followUps];
  for (const level of [10, 20, 30] as const) {
    if (days >= level && !existing.has(level)) {
      result.push({
        level,
        triggeredAt: now().toISOString(),
        acknowledged: false,
        message: followUpMessage(level, p),
      });
    }
  }
  return result;
}

function followUpMessage(level: 10 | 20 | 30, p: Partner): string {
  const contact = p.contact.name.split(" ")[0];
  if (level === 10)
    return `Gentle nudge: ${contact} from ${p.name} hasn't replied in 10 days. The Partner team has been notified.`;
  if (level === 20)
    return `Heads up: 20 days without a response from ${p.name}. Partner team escalation suggested — consider a direct outreach.`;
  return `Escalation: 30 days without a response from ${p.name}. Recommend pausing internal launch comms and re-confirming partner commitment.`;
}

export function unacknowledgedFollowUps(p: Partner): FollowUpAlert[] {
  return (p.followUps ?? []).filter((f) => !f.acknowledged);
}
