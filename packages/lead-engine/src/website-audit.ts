import type { WebsiteAudit } from "./types";

type Fetch = typeof fetch;

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|198\.(18|19)\.|0\.|\[?::1\]?|\[?(fc|fd|fe8|fe9|fea|feb))/i;

export function normalizePublicWebsiteUrl(input: string): string {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const url = new URL(withProtocol);
  if (!['http:', 'https:'].includes(url.protocol) || PRIVATE_HOST.test(url.hostname)) {
    throw new Error("Website URL must use HTTP(S) and a public hostname.");
  }
  url.hash = "";
  return url.toString();
}

export function inspectWebsiteHtml(html: string): { mobileFriendly: boolean; hasClearCta: boolean } {
  const mobileFriendly = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
  const hasClearCta = /(book (now|online)|schedule|request (a )?(quote|consultation)|contact us|call (now|today)|get started)/i.test(
    html.replace(/<[^>]+>/g, " "),
  );
  return { mobileFriendly, hasClearCta };
}

export async function auditWebsite(
  websiteUrl: string | null,
  options: { fetchImpl?: Fetch; timeoutMs?: number } = {},
): Promise<WebsiteAudit> {
  const checkedAt = new Date().toISOString();
  if (!websiteUrl) {
    return { checkedUrl: null, finalUrl: null, status: "missing", httpStatus: null, latencyMs: null, mobileFriendly: null, hasClearCta: null, checkedAt, error: null };
  }

  let checkedUrl: string;
  try {
    checkedUrl = normalizePublicWebsiteUrl(websiteUrl);
  } catch (error) {
    return { checkedUrl: websiteUrl, finalUrl: null, status: "unreachable", httpStatus: null, latencyMs: null, mobileFriendly: null, hasClearCta: null, checkedAt, error: error instanceof Error ? error.message : "Invalid website URL" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);
  const startedAt = Date.now();
  try {
    const response = await (options.fetchImpl ?? fetch)(checkedUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "NYCNJ-SMB-Website-Auditor/1.0" },
    });
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      return { checkedUrl, finalUrl: response.url || checkedUrl, status: "unreachable", httpStatus: response.status, latencyMs, mobileFriendly: null, hasClearCta: null, checkedAt, error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const html = contentType.includes("text/html") ? (await response.text()).slice(0, 1_000_000) : "";
    const signals = inspectWebsiteHtml(html);
    const status = !signals.mobileFriendly || !signals.hasClearCta ? "weak" : "reachable";
    return { checkedUrl, finalUrl: response.url || checkedUrl, status, httpStatus: response.status, latencyMs, ...signals, checkedAt, error: null };
  } catch (error) {
    return { checkedUrl, finalUrl: null, status: "unreachable", httpStatus: null, latencyMs: Date.now() - startedAt, mobileFriendly: null, hasClearCta: null, checkedAt, error: error instanceof Error ? error.message : "Website request failed" };
  } finally {
    clearTimeout(timeout);
  }
}
