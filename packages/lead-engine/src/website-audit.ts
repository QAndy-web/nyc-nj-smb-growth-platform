import type { WebsiteAudit } from "./types";
import { createPublicWebsiteClient, normalizePublicWebsiteUrl } from "./public-website-fetch";

type Fetch = typeof fetch;
export { normalizePublicWebsiteUrl } from "./public-website-fetch";

export function inspectWebsiteHtml(html: string): { mobileFriendly: boolean; hasClearCta: boolean } {
  const mobileFriendly = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
  const hasClearCta = /(book (now|online)|schedule|request (a )?(quote|consultation)|contact us|call (now|today)|get started)/i.test(
    html.replace(/<[^>]+>/g, " "),
  );
  return { mobileFriendly, hasClearCta };
}

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Website request failed";
  if (error instanceof AggregateError) {
    const details = error.errors.map((item: unknown) => getErrorMessage(item)).filter(Boolean);
    return `${error.message}: ${details.join("; ")}`;
  }
  const cause = (error as Error & { cause?: unknown }).cause;
  if (!cause) return error.message;
  const causeMessage = cause instanceof Error ? cause.message : String(cause);
  return `${error.message}: ${causeMessage}`;
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
    const client = createPublicWebsiteClient({
      fetchImpl: options.fetchImpl,
      userAgent: "NYCNJ-SMB-Website-Auditor/1.0",
    });
    const { response, finalUrl } = await client.fetch(checkedUrl, controller.signal);
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      const status = response.status === 404 || response.status === 410 ? "unreachable" : "unknown";
      return { checkedUrl, finalUrl, status, httpStatus: response.status, latencyMs, mobileFriendly: null, hasClearCta: null, checkedAt, error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const html = contentType.includes("text/html") ? (await response.text()).slice(0, 1_000_000) : "";
    const signals = inspectWebsiteHtml(html);
    const status = !signals.mobileFriendly || !signals.hasClearCta ? "weak" : "reachable";
    return { checkedUrl, finalUrl, status, httpStatus: response.status, latencyMs, ...signals, checkedAt, error: null };
  } catch (error) {
    return { checkedUrl, finalUrl: null, status: "unknown", httpStatus: null, latencyMs: Date.now() - startedAt, mobileFriendly: null, hasClearCta: null, checkedAt, error: getErrorMessage(error) };
  } finally {
    clearTimeout(timeout);
  }
}
