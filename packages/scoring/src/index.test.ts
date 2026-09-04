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
    expect(score.fit).toBe(score.businessQuality);
    expect(score.need).toBe(score.digitalWeakness);
    expect(score.reachability).toBe(100);
    expect(score.value).toBe(score.revenuePotential);
    expect(score.confidence).toBe(100);
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

  it("accepts a category-specific revenue potential", () => {
    const score = scoreLead({
      rating: 4.5,
      reviewCount: 100,
      websiteStatus: "weak",
      categoryValue: "high",
      revenuePotential: 82,
    });

    expect(score.revenuePotential).toBe(82);
    expect(score.value).toBe(82);
  });

  it("explains reachability without changing the legacy opportunity formula", () => {
    const withPhone = scoreLead({
      rating: 4.5,
      reviewCount: 100,
      websiteStatus: "unknown",
      phoneAvailable: true,
      categoryValue: "medium",
    });
    const withoutContact = scoreLead({
      rating: 4.5,
      reviewCount: 100,
      websiteStatus: "unknown",
      categoryValue: "medium",
    });

    expect(withPhone.opportunity).toBe(withoutContact.opportunity);
    expect(withPhone.reachability).toBe(65);
    expect(withoutContact.reachability).toBe(25);
    expect(withPhone.confidence).toBe(65);
  });
});
