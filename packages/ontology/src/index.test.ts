import { describe, expect, it } from "vitest";
import { canAdvanceSalesStage, canTransition, validateAgentAction } from "./index";

describe("state transitions", () => {
  it("allows explicit forward and review transitions", () => {
    expect(canTransition("company", "discovered", "verified")).toBe(true);
    expect(canTransition("opportunity", "qualified", "screening")).toBe(true);
  });

  it("rejects impossible transitions", () => {
    expect(canTransition("company", "archived", "verified")).toBe(false);
    expect(canTransition("website_audit", "completed", "running")).toBe(false);
  });

  it("keeps sales progression separate from qualification state", () => {
    expect(canAdvanceSalesStage("not_started", "outreach_ready")).toBe(true);
    expect(canAdvanceSalesStage("not_started", "won")).toBe(false);
    expect(() => validateAgentAction("orchestrator", "advance_sales_stage", {
      entityType: "opportunity",
      currentState: "meeting",
      targetState: "proposal",
      evidenceIds: ["meeting-note-1"],
    })).not.toThrow();
  });
});

describe("agent action permission boundary", () => {
  it("accepts evidence-backed legal state actions", () => {
    expect(() => validateAgentAction("orchestrator", "qualify_opportunity", {
      entityType: "opportunity",
      currentState: "screening",
      targetState: "qualified",
      evidenceIds: ["observation-1"],
    })).not.toThrow();
  });

  it("requires evidence for canonical state mutations", () => {
    expect(() => validateAgentAction("audit", "verify_website", {
      entityType: "website",
      currentState: "candidate",
      targetState: "verified",
    })).toThrow("requires at least one evidence ID");
  });

  it("keeps external effects outside every agent permission", () => {
    expect(() => validateAgentAction("outreach_drafter", "send_outreach", {
      evidenceIds: ["draft-1"],
      approvalId: "approval-1",
    })).toThrow("human-only");
  });
});
