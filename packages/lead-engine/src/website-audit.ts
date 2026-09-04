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

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Website request failed";
  const cause = (error as Error & { cause?: unknown }).cause;
  if (!cause) return error.message;
  const causeMessage = cause instanceof Error ? cause.message : String(cause);
  return `${error.message}: ${causeMessage}`;
}

function readSetCookies(headers: Headers): string[] {
  const extendedHeaders = headers as Headers & { getSetCookie?: () => string[] };
  return extendedHeaders.getSetCookie?.() ?? (headers.get("set-cookie") ? [headers.get("set-cookie") as string] : []);
}

function rememberCookies(cookieJar: Map<string, Map<string, string>>, url: string, headers: Headers): void {
  const origin = new URL(url).origin;
  const cookies = cookieJar.get(origin) ?? new Map<string, string>();
  for (const rawCookie of readSetCookies(headers)) {
    const pair = rawCookie.split(";", 1)[0]?.trim();
    const separator = pair?.indexOf("=") ?? -1;
    if (!pair || separator <= 0) continue;
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  if (cookies.size > 0) cookieJar.set(origin, cookies);
}

async function fetchWithSafeRedirects(
  fetchImpl: Fetch,
  initialUrl: string,
  signal: AbortSignal,
): Promise<{ response: Response; finalUrl: string }> {
  const cookieJar = new Map<string, Map<string, string>>();
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= 8; redirectCount += 1) {
    const cookies = cookieJar.get(new URL(currentUrl).origin);
    const headers: Record<string, string> = { "User-Agent": "NYCNJ-SMB-Website-Auditor/1.0" };
    if (cookies?.size) headers.Cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");

    const response = await fetchImpl(currentUrl, { redirect: "manual", signal, headers });
    rememberCookies(cookieJar, currentUrl, response.headers);

    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: response.url || currentUrl };
    }

    const location = response.headers.get("location");
    if (!location) return { response, finalUrl: response.url || currentUrl };
    currentUrl = normalizePublicWebsiteUrl(new URL(location, currentUrl).toString());
  }

  throw new Error("Website redirect limit exceeded");
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
    const { response, finalUrl } = await fetchWithSafeRedirects(options.fetchImpl ?? fetch, checkedUrl, controller.signal);
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
