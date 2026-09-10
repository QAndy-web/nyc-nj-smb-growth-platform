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

  it("keeps a host cookie across an HTTP to HTTPS redirect", async () => {
    const requests: Array<{ url: string; cookie: string | null }> = [];
    const audit = await auditWebsite("http://example.com", {
      fetchImpl: async (input, init) => {
        const url = String(input);
        requests.push({ url, cookie: new Headers(init?.headers).get("cookie") });
        if (url === "http://example.com/") {
          return new Response(null, {
            status: 301,
            headers: { location: "https://example.com/", "set-cookie": "site_session=ready; Path=/" },
          });
        }
        return new Response('<meta name="viewport" content="width=device-width"><a>Contact us</a>', {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      },
    });

    expect(requests).toEqual([
      { url: "http://example.com/", cookie: null },
      { url: "https://example.com/", cookie: "site_session=ready" },
    ]);
    expect(audit.status).toBe("reachable");
    expect(audit.finalUrl).toBe("https://example.com/");
  });

  it("falls back to HTTP when the HTTPS transport is unavailable", async () => {
    const requested: string[] = [];
    const audit = await auditWebsite("example.com", {
      fetchImpl: async (input) => {
        const url = String(input);
        requested.push(url);
        if (url.startsWith("https:")) throw new TypeError("TLS handshake failed");
        return new Response('<meta name="viewport" content="width=device-width"><a>Request a quote</a>', {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      },
    });

    expect(requested).toEqual(["https://example.com/", "http://example.com/"]);
    expect(audit.status).toBe("reachable");
    expect(audit.finalUrl).toBe("http://example.com/");
  });

  it("uses unknown for anti-bot redirects without a location", async () => {
    const audit = await auditWebsite("https://example.com", {
      fetchImpl: async () => new Response(null, { status: 307, headers: { "set-cookie": "challenge=1; Path=/" } }),
    });

    expect(audit.status).toBe("unknown");
    expect(audit.httpStatus).toBe(307);
  });

  it("does not switch protocols to evade a redirect challenge loop", async () => {
    const requested: string[] = [];
    const audit = await auditWebsite("https://example.com", {
      fetchImpl: async (input) => {
        requested.push(String(input));
        return new Response(null, { status: 302, headers: { location: "/challenge" } });
      },
    });

    expect(requested).toHaveLength(9);
    expect(requested.every((url) => url.startsWith("https:"))).toBe(true);
    expect(audit.status).toBe("unknown");
    expect(audit.error).toContain("redirect limit exceeded");
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
