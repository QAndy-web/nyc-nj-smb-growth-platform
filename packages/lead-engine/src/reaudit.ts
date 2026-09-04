import { scoreLeadForCategory } from "./config";
import { enrichPublicBusinessContacts } from "./email-enrichment";
import type { ContactEnrichment, LeadRepository, WebsiteAudit } from "./types";
import { auditWebsite } from "./website-audit";

export type ExistingLeadForReaudit = {
  businessId: string;
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number;
  categoryId: string;
};

export async function reauditExistingLead(
  dependencies: {
    repository: Pick<
      LeadRepository,
      "saveWebsiteAudit" | "saveContactEnrichment" | "saveScore" | "markBusinessQualityVerified"
    >;
    audit?: (websiteUrl: string | null) => Promise<WebsiteAudit>;
    enrich?: (websiteUrl: string | null) => Promise<ContactEnrichment>;
  },
  lead: ExistingLeadForReaudit,
): Promise<void> {
  const audit = await (dependencies.audit ?? auditWebsite)(lead.websiteUrl);
  await dependencies.repository.saveWebsiteAudit(lead.businessId, audit);

  const enrichment =
    audit.status === "unreachable"
      ? { status: "skipped" as const, contacts: [], pagesScanned: [], error: "Website is unreachable" }
      : await (dependencies.enrich ?? enrichPublicBusinessContacts)(audit.finalUrl ?? lead.websiteUrl);
  if (enrichment.status === "error") {
    throw new Error(enrichment.error ?? "Public contact enrichment was inconclusive");
  }
  await dependencies.repository.saveContactEnrichment(lead.businessId, enrichment);

  const score = scoreLeadForCategory(lead.categoryId, {
    rating: lead.rating,
    reviewCount: lead.reviewCount,
    websiteStatus: audit.status,
    mobileFriendly: audit.mobileFriendly,
    hasClearCta: audit.hasClearCta,
    publicEmailFound: enrichment.contacts.length > 0,
  });
  await dependencies.repository.saveScore(lead.businessId, score);
  await dependencies.repository.markBusinessQualityVerified(lead.businessId);
}
