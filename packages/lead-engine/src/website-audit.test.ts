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

  it("retries a same-URL cookie redirect instead of reporting a reachable site as down", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async (_input, init) => {
      calls += 1;
      if (calls === 1) {
        return new Response(null, { status: 302, headers: { location: "/", "set-cookie": "site_session=ready; Path=/" } });
      }
      expect(new Headers(init?.headers).get("cookie")).toBe("site_session=ready");
      return new Response('<meta name="viewport" content="width=device-width"><a>Book now</a>', {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    };

    const audit = await auditWebsite("https://example.com", { fetchImpl });

    expect(calls).toBe(2);
    expect(audit.status).toBe("reachable");
    expect(audit.httpStatus).toBe(200);
  });

  it("uses unknown for anti-bot redirects without a location", async () => {
    const audit = await auditWebsite("https://example.com", {
      fetchImpl: async () => new Response(null, { status: 307, headers: { "set-cookie": "challenge=1; Path=/" } }),
    });

    expect(audit.status).toBe("unknown");
    expect(audit.httpStatus).toBe(307);
  });

  it("reserves unreachable for a confirmed dead page", async () => {
    const audit = await auditWebsite("https://example.com/missing", {
      fetchImpl: async () => new Response("Not found", { status: 404 }),
    });

    expect(audit.status).toBe("unreachable");
  });

  it("uses unknown for inconclusive network failures", async () => {
    const audit = await auditWebsite("https://example.com", {
      fetchImpl: async () => {
        throw new TypeError("fetch failed", { cause: new Error("redirect count exceeded") });
      },
    });

    expect(audit.status).toBe("unknown");
    expect(audit.error).toContain("redirect count exceeded");
  });
});
