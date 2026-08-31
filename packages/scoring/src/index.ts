export type WebsiteStatus = "missing" | "unreachable" | "weak" | "reachable" | "unknown";

export type LeadInputs = {
  rating?: number | null;
  reviewCount?: number | null;
  websiteStatus: WebsiteStatus;
  mobileFriendly?: boolean | null;
  hasClearCta?: boolean | null;
  publicEmailFound?: boolean;
  categoryValue?: "low" | "medium" | "high";
};

export type LeadScore = {
  businessQuality: number;
  digitalWeakness: number;
  revenuePotential: number;
  opportunity: number;
  tier: "S" | "A" | "B" | "C";
};

export type ScoringConfig = {
  opportunityWeights: {
    businessQuality: number;
    digitalWeakness: number;
    revenuePotential: number;
  };
  tierThresholds: { S: number; A: number; B: number };
  websiteWeakness: Record<WebsiteStatus, number>;
  categoryValue: Record<NonNullable<LeadInputs["categoryValue"]>, number>;
};

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  opportunityWeights: {
    businessQuality: 0.45,
    digitalWeakness: 0.35,
    revenuePotential: 0.2,
  },
  tierThresholds: { S: 85, A: 70, B: 50 },
  websiteWeakness: {
    missing: 100,
    unreachable: 90,
    weak: 75,
    unknown: 45,
    reachable: 10,
  },
  categoryValue: { low: 35, medium: 65, high: 100 },
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function scoreLead(
  input: LeadInputs,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): LeadScore {
  const rating = input.rating ?? 0;
  const normalizedRating = rating < 3 ? 0 : ((rating - 3) / 2) * 100;
  const normalizedReviews = Math.min(Math.log10((input.reviewCount ?? 0) + 1) / 3, 1) * 100;
  const businessQuality = clamp(normalizedRating * 0.6 + normalizedReviews * 0.4);

  let digitalWeakness = config.websiteWeakness[input.websiteStatus];
  if (input.websiteStatus === "reachable") {
    if (input.mobileFriendly === false) digitalWeakness += 30;
    if (input.hasClearCta === false) digitalWeakness += 25;
  }
  digitalWeakness = clamp(digitalWeakness);

  const revenuePotential = config.categoryValue[input.categoryValue ?? "medium"];
  const { opportunityWeights: weights } = config;
  const contactBonus = input.publicEmailFound ? 3 : 0;
  const opportunity = clamp(
    businessQuality * weights.businessQuality +
      digitalWeakness * weights.digitalWeakness +
      revenuePotential * weights.revenuePotential +
      contactBonus,
  );

  const { tierThresholds } = config;
  const tier: LeadScore["tier"] =
    opportunity >= tierThresholds.S
      ? "S"
      : opportunity >= tierThresholds.A
        ? "A"
        : opportunity >= tierThresholds.B
          ? "B"
          : "C";

  return { businessQuality, digitalWeakness, revenuePotential, opportunity, tier };
}
