import { describe, expect, it } from "vitest";
import { parseCreateAgentJobRequest } from "./index";

const BUSINESS_ID = "11111111-1111-4111-8111-111111111111";

describe("agent job contract", () => {
  it("accepts an evidence-producing audit job", () => {
    expect(parseCreateAgentJobRequest({ agentType: "audit", businessId: BUSINESS_ID, input: { level: "basic" } })).toEqual({
      agentType: "audit",
      action: "run_website_audit",
      actionContext: undefined,
      businessId: BUSINESS_ID,
      projectId: undefined,
      input: { level: "basic" },
      idempotencyKey: undefined,
      priority: undefined,
    });
  });

  it("rejects targeted jobs without their target", () => {
    expect(() => parseCreateAgentJobRequest({ agentType: "outreach_drafter", input: {} })).toThrow("require businessId");
    expect(() => parseCreateAgentJobRequest({ agentType: "project_tracker", input: {} })).toThrow("require projectId");
  });

  it("rejects unknown agents and non-object input", () => {
    expect(() => parseCreateAgentJobRequest({ agentType: "sender", input: {} })).toThrow("agentType must be one of");
    expect(() => parseCreateAgentJobRequest({ agentType: "scout", input: "all NYC" })).toThrow("input must be a JSON object");
  });

  it("accepts an explicit evidence-backed state transition action", () => {
    expect(parseCreateAgentJobRequest({
      agentType: "orchestrator",
      businessId: BUSINESS_ID,
      action: "qualify_opportunity",
      actionContext: {
        entityType: "opportunity",
        currentState: "screening",
        targetState: "qualified",
        evidenceIds: ["finding-1"],
      },
      input: { opportunityId: "opportunity-1" },
    }).action).toBe("qualify_opportunity");
  });

  it("rejects state changes that bypass evidence or permissions", () => {
    expect(() => parseCreateAgentJobRequest({
      agentType: "orchestrator",
      action: "qualify_opportunity",
      actionContext: { entityType: "opportunity", currentState: "screening", targetState: "qualified" },
      input: {},
    })).toThrow("requires at least one evidence ID");
    expect(() => parseCreateAgentJobRequest({
      agentType: "outreach_drafter",
      businessId: BUSINESS_ID,
      action: "send_outreach",
      actionContext: { evidenceIds: ["draft-1"], approvalId: "approval-1" },
      input: {},
    })).toThrow("human-only");
  });
});
