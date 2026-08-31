import { describe, expect, it } from "vitest";
import { auditWebsite, inspectWebsiteHtml } from "./website-audit";

describe("website audit", () => {
  it("recognizes mobile and conversion signals", () => {
    expect(inspectWebsiteHtml('<meta name="viewport" content="width=device-width"><a>Book now</a>')).toEqual({
      mobileFriendly: true,
      hasClearCta: true,
    });
  });

  it("classifies a reachable but weak website", async () => {
    const audit = await auditWebsite("https://example.com", {
      fetchImpl: async () => new Response("<html><body>Welcome</body></html>", { headers: { "content-type": "text/html" } }),
    });
    expect(audit.status).toBe("weak");
    expect(audit.httpStatus).toBe(200);
  });
});
