import type { AgentJobStatus, AgentType, CreateAgentJobRequest } from "@growth/agent-core";
import { createAdminClient } from "./supabase";

export type AgentJobRow = {
  id: string;
  agent_type: AgentType;
  status: AgentJobStatus;
  business_id: string | null;
  project_id: string | null;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  idempotency_key: string;
  priority: number;
  error_message: string | null;
  requested_at: string;
  updated_at: string;
};

export async function listAgentJobs(filters: { status?: AgentJobStatus; agentType?: AgentType }, limit = 100) {
  let query = createAdminClient().from("agent_jobs").select("*").order("priority", { ascending: false }).order("requested_at", { ascending: false }).limit(limit);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.agentType) query = query.eq("agent_type", filters.agentType);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load agent jobs: ${error.message}`);
  return (data ?? []) as AgentJobRow[];
}

export async function createAgentJob(request: CreateAgentJobRequest): Promise<AgentJobRow> {
  const client = createAdminClient();
  const idempotencyKey = request.idempotencyKey ?? crypto.randomUUID();
  const row = {
    agent_type: request.agentType,
    business_id: request.businessId ?? null,
    project_id: request.projectId ?? null,
    input_payload: request.input,
    idempotency_key: idempotencyKey,
    priority: request.priority ?? 50,
  };
  const inserted = await client.from("agent_jobs").insert(row).select("*").single();
  if (!inserted.error && inserted.data) return inserted.data as AgentJobRow;
  if (inserted.error?.code === "23505") {
    const existing = await client.from("agent_jobs").select("*").eq("idempotency_key", idempotencyKey).single();
    if (!existing.error && existing.data) return existing.data as AgentJobRow;
  }
  throw new Error(`Could not queue agent job: ${inserted.error?.message ?? "unknown database error"}`);
}
