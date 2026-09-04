import {
  ACTION_NAMES,
  ACTION_REGISTRY,
  AGENT_TYPES,
  DEFAULT_AGENT_ACTION,
  validateAgentAction,
  type ActionName,
  type AgentActionContext,
  type AgentType,
} from "@growth/ontology";

export { ACTION_NAMES, ACTION_REGISTRY, AGENT_TYPES, DEFAULT_AGENT_ACTION } from "@growth/ontology";
export type { ActionName, AgentActionContext, AgentType } from "@growth/ontology";
export type AgentJobStatus = "queued" | "running" | "needs_review" | "succeeded" | "failed" | "cancelled";

export type AgentContractMap = {
  orchestrator: {
    input: { goal: string; businessId?: string; projectId?: string; allowedAgents: AgentType[] };
    output: { childJobs: Array<{ agentType: AgentType; reason: string }>; nextCheckpoint: string };
  };
  scout: {
    input: { territoryId: string; categoryId: string; maxCells: number; maxPagesPerCell: number };
    output: { businessIds: string[]; placesFetched: number; businessesUpserted: number; errors: number };
  };
  audit: {
    input: { businessId: string; level: "basic" | "detailed" };
    output: { auditId: string; websiteStatus: string; evidence: Array<{ sourceUrl: string; finding: string }> };
  };
  demo_generator: {
    input: { businessId: string; auditId: string; templateId: string };
    output: { demoId: string; previewUrl: string | null; reviewRequired: true };
  };
  outreach_drafter: {
    input: { businessId: string; demoId?: string; channel: "email" };
    output: { subject: string; body: string; sourceFacts: string[]; humanApprovalRequired: true };
  };
  project_tracker: {
    input: { projectId: string; event: string; evidence?: string[] };
    output: { progressPercent: number; status: string; blockers: string[]; nextAction: string | null };
  };
};

export type CreateAgentJobRequest = {
  agentType: AgentType;
  action: ActionName;
  actionContext?: AgentActionContext;
  businessId?: string;
  projectId?: string;
  input: Record<string, unknown>;
  idempotencyKey?: string;
  priority?: number;
};

export const AGENT_CATALOG: ReadonlyArray<{
  type: AgentType;
  label: string;
  purpose: string;
  reviewGate: string;
}> = [
  { type: "orchestrator", label: "Orchestrator", purpose: "Chooses the next specialist job from pipeline state.", reviewGate: "Cannot bypass specialist or human review gates." },
  { type: "scout", label: "Scout", purpose: "Discovers and normalizes public NYC/NJ business records.", reviewGate: "Cost-bounded scans and provider limits." },
  { type: "audit", label: "Audit", purpose: "Produces evidence-backed technical and conversion findings.", reviewGate: "Findings retain source URLs." },
  { type: "demo_generator", label: "Demo Generator", purpose: "Creates a reviewable preview from approved facts and templates.", reviewGate: "Human review before sharing externally." },
  { type: "outreach_drafter", label: "Outreach", purpose: "Drafts personalized outreach without sending it.", reviewGate: "Explicit human approval; no automatic send." },
  { type: "project_tracker", label: "Project Tracker", purpose: "Updates delivery progress from recorded evidence.", reviewGate: "Cannot mark launch complete without QA evidence." },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)) {
    throw new Error(`${field} must be a UUID.`);
  }
  return value;
}

function optionalStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`${field} must be an array of non-empty strings.`);
  }
  return value.map((item) => item.trim());
}

function parseActionContext(value: unknown): AgentActionContext | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error("actionContext must be a JSON object.");
  const optionalString = (field: string) => {
    const fieldValue = value[field];
    if (fieldValue === undefined) return undefined;
    if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
      throw new Error(`actionContext.${field} must be a non-empty string.`);
    }
    return fieldValue.trim();
  };
  return {
    entityType: optionalString("entityType") as AgentActionContext["entityType"],
    currentState: optionalString("currentState"),
    targetState: optionalString("targetState"),
    evidenceIds: optionalStringArray(value.evidenceIds, "actionContext.evidenceIds"),
    approvalId: optionalString("approvalId"),
  };
}

export function parseCreateAgentJobRequest(value: unknown): CreateAgentJobRequest {
  if (!isRecord(value)) throw new Error("Request body must be a JSON object.");
  if (typeof value.agentType !== "string" || !AGENT_TYPES.includes(value.agentType as AgentType)) {
    throw new Error(`agentType must be one of: ${AGENT_TYPES.join(", ")}.`);
  }
  if (!isRecord(value.input)) throw new Error("input must be a JSON object.");

  const agentType = value.agentType as AgentType;
  const hasExplicitAction = value.action !== undefined;
  const action = !hasExplicitAction
    ? DEFAULT_AGENT_ACTION[agentType]
    : typeof value.action === "string" && ACTION_NAMES.includes(value.action as ActionName)
      ? value.action as ActionName
      : undefined;
  if (!action) throw new Error(`action must be one of: ${ACTION_NAMES.join(", ")}.`);
  const actionContext = parseActionContext(value.actionContext);
  // Legacy queue envelopes remain accepted and are assigned their safest
  // producer action. Explicit state-changing actions always cross the full
  // permission, evidence and transition boundary.
  if (hasExplicitAction || actionContext) validateAgentAction(agentType, action, actionContext);
  const businessId = optionalUuid(value.businessId, "businessId");
  const projectId = optionalUuid(value.projectId, "projectId");
  if (["audit", "demo_generator", "outreach_drafter"].includes(agentType) && !businessId) {
    throw new Error(`${agentType} jobs require businessId.`);
  }
  if (agentType === "project_tracker" && !projectId) {
    throw new Error("project_tracker jobs require projectId.");
  }

  const priority = value.priority === undefined ? undefined : Number(value.priority);
  if (priority !== undefined && (!Number.isInteger(priority) || priority < 0 || priority > 100)) {
    throw new Error("priority must be an integer from 0 to 100.");
  }
  if (value.idempotencyKey !== undefined && (typeof value.idempotencyKey !== "string" || value.idempotencyKey.trim().length < 8)) {
    throw new Error("idempotencyKey must contain at least 8 characters.");
  }

  return {
    agentType,
    action,
    actionContext,
    businessId,
    projectId,
    input: value.input,
    idempotencyKey: typeof value.idempotencyKey === "string" ? value.idempotencyKey.trim() : undefined,
    priority,
  };
}
