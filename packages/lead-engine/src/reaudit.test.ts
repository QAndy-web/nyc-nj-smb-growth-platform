import { describe, expect, it, vi } from "vitest";
import { reauditExistingLead } from "./reaudit";

describe("reauditExistingLead", () => {
  it("replaces derived facts and verifies quality only after a complete rescore", async () => {
    const calls: string[] = [];
    const repository = {
      saveWebsiteAudit: vi.fn(async () => { calls.push("audit"); }),
      saveContactEnrichment: vi.fn(async () => { calls.push("contacts"); }),
      saveScore: vi.fn(async () => { calls.push("score"); }),
      markBusinessQualityVerified: vi.fn(async () => { calls.push("verified"); }),
    };

    await reauditExistingLead(
      {
        repository,
        audit: async () => ({
          checkedUrl: "https://example.com/",
          finalUrl: "https://example.com/",
          status: "weak",
          httpStatus: 200,
          latencyMs: 5,
          mobileFriendly: true,
          hasClearCta: false,
          checkedAt: "2026-09-04T00:00:00.000Z",
          error: null,
        }),
        enrich: async () => ({
          status: "found",
          contacts: [{ email: "office@example.com", sourceUrl: "https://example.com/", extractionMethod: "mailto", confidence: "high" }],
          pagesScanned: ["https://example.com/"],
          error: null,
        }),
      },
      { businessId: "business-1", websiteUrl: "https://example.com", rating: 4.8, reviewCount: 120, categoryId: "dentists" },
    );

    expect(calls).toEqual(["audit", "contacts", "score", "verified"]);
    expect(repository.saveScore).toHaveBeenCalledWith(
      "business-1",
      expect.objectContaining({ digitalWeakness: 75 }),
    );
  });

  it("does not mark a lead verified when persistence fails", async () => {
    const repository = {
      saveWebsiteAudit: vi.fn(async () => undefined),
      saveContactEnrichment: vi.fn(async () => undefined),
      saveScore: vi.fn(async () => { throw new Error("write failed"); }),
      markBusinessQualityVerified: vi.fn(async () => undefined),
    };

    await expect(
      reauditExistingLead(
        {
          repository,
          audit: async () => ({ checkedUrl: null, finalUrl: null, status: "missing", httpStatus: null, latencyMs: null, mobileFriendly: null, hasClearCta: null, checkedAt: "2026-09-04T00:00:00.000Z", error: null }),
          enrich: async () => ({ status: "skipped", contacts: [], pagesScanned: [], error: null }),
        },
        { businessId: "business-1", websiteUrl: null, rating: 4.5, reviewCount: 80, categoryId: "dentists" },
      ),
    ).rejects.toThrow("write failed");
    expect(repository.markBusinessQualityVerified).not.toHaveBeenCalled();
  });

  it("keeps prior derived data pending when contact discovery is inconclusive", async () => {
    const repository = {
      saveWebsiteAudit: vi.fn(async () => undefined),
      saveContactEnrichment: vi.fn(async () => undefined),
      saveScore: vi.fn(async () => undefined),
      markBusinessQualityVerified: vi.fn(async () => undefined),
    };

    await expect(
      reauditExistingLead(
        {
          repository,
          audit: async () => ({ checkedUrl: "https://example.com/", finalUrl: "https://example.com/", status: "unknown", httpStatus: 403, latencyMs: 5, mobileFriendly: null, hasClearCta: null, checkedAt: "2026-09-04T00:00:00.000Z", error: "HTTP 403" }),
          enrich: async () => ({ status: "error", contacts: [], pagesScanned: ["https://example.com/"], error: "challenge loop" }),
        },
        { businessId: "business-1", websiteUrl: "https://example.com", rating: 4.5, reviewCount: 80, categoryId: "dentists" },
      ),
    ).rejects.toThrow("challenge loop");
    expect(repository.saveContactEnrichment).not.toHaveBeenCalled();
    expect(repository.saveScore).not.toHaveBeenCalled();
    expect(repository.markBusinessQualityVerified).not.toHaveBeenCalled();
  });
});
