import { describe, expect, it } from "vitest";
import { DEFAULT_SCORING_CONFIG, scoreLead } from "./index";

describe("scoreLead", () => {
  it("places a strong business with no website in tier S", () => {
    const score = scoreLead({
      rating: 4.9,
      reviewCount: 480,
      websiteStatus: "missing",
      publicEmailFound: true,
      categoryValue: "high",
    });

    expect(score.businessQuality).toBeGreaterThan(85);
    expect(score.digitalWeakness).toBe(100);
    expect(score.tier).toBe("S");
  });

  it("does not over-prioritize a low-quality business just because it has no website", () => {
    const score = scoreLead({
      rating: 3.2,
      reviewCount: 2,
      websiteStatus: "missing",
      categoryValue: "low",
    });

    expect(score.businessQuality).toBeLessThan(15);
    expect(score.tier).toBe("C");
  });

  it("supports explicit configurable weights and thresholds", () => {
    const score = scoreLead(
      { rating: 4.5, reviewCount: 100, websiteStatus: "reachable", categoryValue: "medium" },
      {
        ...DEFAULT_SCORING_CONFIG,
        opportunityWeights: { businessQuality: 1, digitalWeakness: 0, revenuePotential: 0 },
        tierThresholds: { S: 70, A: 50, B: 30 },
      },
    );

    expect(score.opportunity).toBe(score.businessQuality);
    expect(score.tier).toBe("S");
  });
});
