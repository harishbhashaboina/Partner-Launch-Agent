export type PartnerArchetype =
  | "Data Affiliate"
  | "Go-To-Market"
  | "Platform"
  | "Channel";

export type PartnerStage =
  | "research"
  | "internal-review"
  | "partner-chat"
  | "summarized"
  | "launching"
  | "live"
  | "retro";

export interface ResearchBrief {
  valueProp: string;
  idealCustomerProfile: string;
  archetype: PartnerArchetype;
  archetypeRationale: string;
  scope: string;
  competitiveLandscape: string;
  riskFlags: string[];
}

export interface InternalAwareness {
  subject: string;
  body: string;
  approvedAt?: string;
}

export type ChatRole = "agent" | "partner" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  ts: string;
  attachments?: Attachment[];
  meta?: {
    step?: PartnerChatStep;
  };
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  excerpt?: string;
}

export type PartnerChatStep =
  | "welcome"
  | "intake"
  | "summary"
  | "closed"
  /** legacy rows in persisted store.json */
  | "review-details"
  | "integration-details"
  | "target-date";

export interface PartnerChatState {
  token: string;
  step: PartnerChatStep;
  messages: ChatMessage[];
  attachments: Attachment[];
  lastPartnerResponseAt?: string;
  /** @deprecated legacy intake; retained for older store rows */
  partnerInputs?: {
    reviewNotes?: string;
    integrationDescription?: string;
    targetDate?: string;
  };
  /** Index of the next question in the flattened intake questionnaire */
  intakeIndex?: number;
  /** Structured answers keyed by question id (including expanded repeatable keys) */
  intakeAnswers?: Record<string, unknown>;
}

export interface LaunchCommunication {
  id: "coming-soon" | "prepare-for-launch" | "new-partner-live";
  title: string;
  sendDate: string;
  status: "scheduled" | "drafted" | "sent";
  subject: string;
  body: string;
  attachments: string[];
}

export interface LaunchTimeline {
  targetDate: string;
  milestones: Array<{
    name: string;
    date: string;
    description: string;
  }>;
  communications: LaunchCommunication[];
}

export interface MetricsRetro {
  submittedAt: string;
  kpis: Record<string, string>;
  successStories: string;
  generatedNarrative: string;
  archetypeSlide: string;
}

export interface FollowUpAlert {
  level: 10 | 20 | 30;
  triggeredAt: string;
  acknowledged: boolean;
  message: string;
}

export interface Partner {
  id: string;
  name: string;
  website: string;
  contact: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  stage: PartnerStage;
  research?: ResearchBrief;
  internalAwareness?: InternalAwareness;
  partnerChat?: PartnerChatState;
  summary?: {
    finalizedAt: string;
    valueProp: string;
    idealCustomerProfile: string;
    scope: string;
    integrationOverview: string;
    targetDate: string;
    partnerNotes: string;
  };
  timeline?: LaunchTimeline;
  metrics?: MetricsRetro;
  followUps: FollowUpAlert[];
}

export interface Store {
  partners: Record<string, Partner>;
  order: string[];
}
