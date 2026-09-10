export const AGENT_TYPES = [
  "orchestrator",
  "scout",
  "audit",
  "demo_generator",
  "outreach_drafter",
  "project_tracker",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export const COMPANY_STATES = ["discovered", "identity_pending", "verified", "rejected", "archived"] as const;
export const WEBSITE_STATES = ["candidate", "verified", "rejected", "unknown"] as const;
export const CONTACT_STATES = ["candidate", "verified", "rejected", "superseded"] as const;
export const AUDIT_STATES = ["requested", "running", "completed", "inconclusive", "failed"] as const;
export const OPPORTUNITY_QUALIFICATION_STATES = ["unassessed", "screening", "qualified", "disqualified"] as const;
export const SALES_STAGES = ["not_started", "outreach_ready", "contacted", "replied", "meeting", "proposal", "won", "lost"] as const;
export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "cancelled", "expired"] as const;

export type CompanyState = (typeof COMPANY_STATES)[number];
export type WebsiteState = (typeof WEBSITE_STATES)[number];
export type ContactState = (typeof CONTACT_STATES)[number];
export type AuditState = (typeof AUDIT_STATES)[number];
export type OpportunityQualificationState = (typeof OPPORTUNITY_QUALIFICATION_STATES)[number];
export type SalesStage = (typeof SALES_STAGES)[number];
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const DOMAIN_EVENT_TYPES = [
  "observation.recorded",
  "company.verified",
  "website.verified",
  "audit.completed",
  "opportunity.qualified",
  "contact.verified",
  "approval.requested",
  "approval.resolved",
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];
export type StateEntityType = "company" | "website" | "contact" | "website_audit" | "opportunity" | "project";

type StateTransitionMap = Readonly<Record<string, readonly string[]>>;

export const STATE_TRANSITIONS: Readonly<Record<StateEntityType, StateTransitionMap>> = {
  company: {
    discovered: ["identity_pending", "verified", "rejected", "archived"],
    identity_pending: ["verified", "rejected", "archived"],
    verified: ["identity_pending", "archived"],
    rejected: ["identity_pending", "archived"],
    archived: [],
  },
  website: {
    candidate: ["verified", "rejected", "unknown"],
    verified: ["candidate", "unknown", "rejected"],
    rejected: ["candidate"],
    unknown: ["candidate", "verified", "rejected"],
  },
  contact: {
    candidate: ["verified", "rejected", "superseded"],
    verified: ["superseded", "rejected"],
    rejected: ["candidate", "superseded"],
    superseded: [],
  },
  website_audit: {
    requested: ["running", "failed"],
    running: ["completed", "inconclusive", "failed"],
    completed: [],
    inconclusive: ["requested"],
    failed: ["requested"],
  },
  opportunity: {
    unassessed: ["screening", "qualified", "disqualified"],
    screening: ["qualified", "disqualified"],
    qualified: ["screening", "disqualified"],
    disqualified: ["screening"],
  },
  project: {
    planned: ["active", "cancelled"],
    active: ["blocked", "completed", "cancelled"],
    blocked: ["active", "cancelled"],
    completed: [],
    cancelled: [],
  },
};

export const SALES_TRANSITIONS: StateTransitionMap = {
  not_started: ["outreach_ready"],
  outreach_ready: ["contacted"],
  contacted: ["replied", "lost"],
  replied: ["meeting", "lost"],
  meeting: ["proposal", "lost"],
  proposal: ["won", "lost"],
  won: [],
  lost: [],
};

export function canTransition(entityType: StateEntityType, from: string, to: string): boolean {
  if (from === to) return true;
  return STATE_TRANSITIONS[entityType][from]?.includes(to) ?? false;
}

export function canAdvanceSalesStage(from: string, to: string): boolean {
  if (from === to) return true;
  return SALES_TRANSITIONS[from]?.includes(to) ?? false;
}

export const ACTION_NAMES = [
  "plan_next_action",
  "record_observation",
  "run_website_audit",
  "generate_demo",
  "draft_outreach",
  "update_project",
  "verify_company",
  "verify_website",
  "complete_audit",
  "verify_contact",
  "qualify_opportunity",
  "advance_sales_stage",
  "request_approval",
  "share_demo",
  "send_outreach",
  "launch_project",
] as const;

export type ActionName = (typeof ACTION_NAMES)[number];
export type ApprovalPolicy = "none" | "required" | "human_only";

export type ActionDefinition = {
  name: ActionName;
  label: string;
  allowedAgents: readonly AgentType[];
  entityType: StateEntityType | "observation" | "demo" | "outreach" | "orchestration";
  transitionEntity?: StateEntityType;
  transitionGraph?: "entity" | "sales";
  requiresEvidence: boolean;
  approvalPolicy: ApprovalPolicy;
  externalEffect: boolean;
  emits?: DomainEventType;
};

export const ACTION_REGISTRY: Readonly<Record<ActionName, ActionDefinition>> = {
  plan_next_action: { name: "plan_next_action", label: "Plan next action", allowedAgents: ["orchestrator"], entityType: "orchestration", requiresEvidence: false, approvalPolicy: "none", externalEffect: false },
  record_observation: { name: "record_observation", label: "Record raw observation", allowedAgents: ["scout", "audit"], entityType: "observation", requiresEvidence: false, approvalPolicy: "none", externalEffect: false, emits: "observation.recorded" },
  run_website_audit: { name: "run_website_audit", label: "Run website audit", allowedAgents: ["audit"], entityType: "website_audit", requiresEvidence: false, approvalPolicy: "none", externalEffect: false },
  generate_demo: { name: "generate_demo", label: "Generate review preview", allowedAgents: ["demo_generator"], entityType: "demo", requiresEvidence: true, approvalPolicy: "none", externalEffect: false },
  draft_outreach: { name: "draft_outreach", label: "Draft outreach", allowedAgents: ["outreach_drafter"], entityType: "outreach", requiresEvidence: true, approvalPolicy: "none", externalEffect: false },
  update_project: { name: "update_project", label: "Update project from evidence", allowedAgents: ["project_tracker"], entityType: "project", requiresEvidence: true, approvalPolicy: "none", externalEffect: false },
  verify_company: { name: "verify_company", label: "Verify company identity", allowedAgents: ["orchestrator"], entityType: "company", transitionEntity: "company", transitionGraph: "entity", requiresEvidence: true, approvalPolicy: "none", externalEffect: false, emits: "company.verified" },
  verify_website: { name: "verify_website", label: "Verify canonical website", allowedAgents: ["audit"], entityType: "website", transitionEntity: "website", transitionGraph: "entity", requiresEvidence: true, approvalPolicy: "none", externalEffect: false, emits: "website.verified" },
  complete_audit: { name: "complete_audit", label: "Complete website audit", allowedAgents: ["audit"], entityType: "website_audit", transitionEntity: "website_audit", transitionGraph: "entity", requiresEvidence: true, approvalPolicy: "none", externalEffect: false, emits: "audit.completed" },
  verify_contact: { name: "verify_contact", label: "Verify public contact", allowedAgents: ["audit"], entityType: "contact", transitionEntity: "contact", transitionGraph: "entity", requiresEvidence: true, approvalPolicy: "none", externalEffect: false, emits: "contact.verified" },
  qualify_opportunity: { name: "qualify_opportunity", label: "Qualify opportunity", allowedAgents: ["orchestrator"], entityType: "opportunity", transitionEntity: "opportunity", transitionGraph: "entity", requiresEvidence: true, approvalPolicy: "none", externalEffect: false, emits: "opportunity.qualified" },
  advance_sales_stage: { name: "advance_sales_stage", label: "Advance sales stage", allowedAgents: ["orchestrator"], entityType: "opportunity", transitionEntity: "opportunity", transitionGraph: "sales", requiresEvidence: true, approvalPolicy: "none", externalEffect: false },
  request_approval: { name: "request_approval", label: "Request human approval", allowedAgents: ["orchestrator", "demo_generator", "outreach_drafter", "project_tracker"], entityType: "orchestration", requiresEvidence: true, approvalPolicy: "none", externalEffect: false, emits: "approval.requested" },
  share_demo: { name: "share_demo", label: "Share demo externally", allowedAgents: [], entityType: "demo", requiresEvidence: true, approvalPolicy: "human_only", externalEffect: true },
  send_outreach: { name: "send_outreach", label: "Send outreach", allowedAgents: [], entityType: "outreach", requiresEvidence: true, approvalPolicy: "human_only", externalEffect: true },
  launch_project: { name: "launch_project", label: "Launch client project", allowedAgents: [], entityType: "project", requiresEvidence: true, approvalPolicy: "human_only", externalEffect: true },
};

export const DEFAULT_AGENT_ACTION: Readonly<Record<AgentType, ActionName>> = {
  orchestrator: "plan_next_action",
  scout: "record_observation",
  audit: "run_website_audit",
  demo_generator: "generate_demo",
  outreach_drafter: "draft_outreach",
  project_tracker: "update_project",
};

export type AgentActionContext = {
  entityType?: StateEntityType;
  currentState?: string;
  targetState?: string;
  evidenceIds?: string[];
  approvalId?: string;
};

export function validateAgentAction(
  agentType: AgentType,
  actionName: ActionName,
  context: AgentActionContext = {},
): void {
  const action = ACTION_REGISTRY[actionName];
  if (!action.allowedAgents.includes(agentType)) {
    const boundary = action.approvalPolicy === "human_only" ? "is human-only" : `does not allow ${agentType}`;
    throw new Error(`${actionName} ${boundary}.`);
  }
  if (action.requiresEvidence && (context.evidenceIds?.length ?? 0) === 0) {
    throw new Error(`${actionName} requires at least one evidence ID.`);
  }
  if (action.approvalPolicy === "required" && !context.approvalId) {
    throw new Error(`${actionName} requires an approved Approval ID.`);
  }
  if (action.transitionEntity) {
    if (context.entityType !== action.transitionEntity || !context.currentState || !context.targetState) {
      throw new Error(`${actionName} requires entityType, currentState and targetState.`);
    }
    const allowed = action.transitionGraph === "sales"
      ? canAdvanceSalesStage(context.currentState, context.targetState)
      : canTransition(action.transitionEntity, context.currentState, context.targetState);
    if (!allowed) {
      throw new Error(`Illegal ${action.transitionEntity} transition: ${context.currentState} -> ${context.targetState}.`);
    }
  }
}
