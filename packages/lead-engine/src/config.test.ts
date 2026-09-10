import { describe, expect, it } from "vitest";
import { INDUSTRY_PILOT_PROFILES, scoreLeadForCategory } from "./config";

describe("industry pilot profiles", () => {
  it("defines a calibrated profile for every requested expansion category", () => {
    expect(INDUSTRY_PILOT_PROFILES.map((profile) => profile.categoryId).sort()).toEqual(
      ["accountants", "contractors", "electricians", "hvac", "lawyers", "med-spas", "plumbers"],
    );
  });

  it("uses normalized weights and bounded two-market samples", () => {
    for (const profile of INDUSTRY_PILOT_PROFILES) {
      const weights = Object.values(profile.opportunityWeights);
      expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1);
      expect(profile.calibrationSample.nyc).toBeGreaterThanOrEqual(12);
      expect(profile.calibrationSample.nj).toBeGreaterThanOrEqual(12);
      expect(profile.calibrationSample.nyc + profile.calibrationSample.nj).toBeLessThanOrEqual(32);
    }
  });

  it("applies the category profile through the shared scoring boundary", () => {
    const score = scoreLeadForCategory("accountants", {
      rating: 4.7,
      reviewCount: 80,
      websiteStatus: "weak",
    });
    expect(score.revenuePotential).toBe(85);
  });
});
