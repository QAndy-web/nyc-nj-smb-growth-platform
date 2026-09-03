import { AGENT_TYPES, parseCreateAgentJobRequest, type AgentJobStatus, type AgentType } from "@growth/agent-core";
import { createAgentJob, listAgentJobs } from "../../../lib/agent-jobs";

export const dynamic = "force-dynamic";

const JOB_STATUSES: AgentJobStatus[] = ["queued", "running", "needs_review", "succeeded", "failed", "cancelled"];

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const rawStatus = params.get("status");
    const rawAgent = params.get("agentType");
    const status = JOB_STATUSES.includes(rawStatus as AgentJobStatus) ? rawStatus as AgentJobStatus : undefined;
    const agentType = AGENT_TYPES.includes(rawAgent as AgentType) ? rawAgent as AgentType : undefined;
    return Response.json({ rows: await listAgentJobs({ status, agentType }) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load agent jobs" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body;
  try {
    body = parseCreateAgentJobRequest(await request.json());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid agent job request" }, { status: 400 });
  }

  try {
    const job = await createAgentJob(body);
    return Response.json({ job, execution: "queued", humanReviewRequired: ["demo_generator", "outreach_drafter"].includes(job.agent_type) }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not queue agent job";
    return Response.json({ error: message }, { status: 503 });
  }
}
