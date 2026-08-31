export type LeadInputs = {
  rating?: number | null;
  reviewCount?: number | null;
  hasWebsite: boolean;
  websiteReachable?: boolean | null;
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

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function scoreLead(input: LeadInputs): LeadScore {
  const ratingScore = input.rating ? Math.max(0, (input.rating - 3) / 2) * 55 : 0;
  const reviewScore = Math.min(Math.log10((input.reviewCount ?? 0) + 1) / 3, 1) * 35;
  const contactBonus = input.publicEmailFound ? 10 : 0;
  const businessQuality = clamp(ratingScore + reviewScore + contactBonus);

  let weakness = 0;
  if (!input.hasWebsite) {
    weakness = 100;
  } else {
    if (input.websiteReachable === false) weakness += 45;
    if (input.mobileFriendly === false) weakness += 30;
    if (input.hasClearCta === false) weakness += 25;
  }
  const digitalWeakness = clamp(weakness);

  const revenuePotential =
    input.categoryValue === "high" ? 100 : input.categoryValue === "medium" ? 65 : 35;

  const opportunity = clamp(
    businessQuality * 0.4 + digitalWeakness * 0.4 + revenuePotential * 0.2,
  );

  const tier: LeadScore["tier"] =
    opportunity >= 85 ? "S" : opportunity >= 70 ? "A" : opportunity >= 50 ? "B" : "C";

  return { businessQuality, digitalWeakness, revenuePotential, opportunity, tier };
}
